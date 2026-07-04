import os
import time
import json
import asyncio
from fastapi import HTTPException
from fastapi.responses import JSONResponse
from .config import (
    ALLOWED_MODEL_DIRS,
    ALLOWED_PROXIES,
    SYSAWARE_ALLOW_UNSAFE_LOAD,
    IS_PRODUCTION,
)
from ..infrastructure.model_loader import is_path_allowed, load_model_from_path

def validate_model_path_and_load(model_path: str, unsafe_load: bool = False):
    if not is_path_allowed(model_path):
        raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
    if unsafe_load and not SYSAWARE_ALLOW_UNSAFE_LOAD:
        raise HTTPException(status_code=400, detail="Unsafe model loading is disabled on this server.")

def validate_host_and_port(host: str, port: int):
    host_clean = host.strip().lower()
    if host_clean in ALLOWED_PROXIES:
        return
    if host_clean == "localhost":
        return
    import ipaddress
    try:
        ip = ipaddress.ip_address(host_clean)
        if ip.is_loopback:
            return
    except ValueError:
        pass
    raise HTTPException(status_code=400, detail=f"Access denied: Host '{host}' is not in the proxy allowlist.")

def handle_api_exception(e: Exception):
    print(f"API Exception: {e}")
    import traceback
    traceback.print_exc()
    if isinstance(e, HTTPException):
        raise e
    import sysaware.server as server
    is_production = getattr(server, "IS_PRODUCTION", IS_PRODUCTION)
    if is_production:
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    else:
        raise HTTPException(status_code=500, detail=str(e))

def worker_wrapper(func_name, args, queue):
    """
    Subprocess worker target. Resolves func_name to the actual helper function,
    runs the generator, puts its items into queue, and handles errors.
    """
    try:
        if func_name == "autotune_worker":
            func = autotune_worker
        elif func_name == "diagnose_worker":
            func = diagnose_worker
        elif func_name == "tune_runtime_worker":
            func = tune_runtime_worker
        elif func_name == "chat_worker":
            func = chat_worker
        else:
            raise ValueError(f"Unknown worker function: {func_name}")

        gen = func(*args)
        for item in gen:
            queue.put(("next", item))
        queue.put(("done", None))
    except Exception as e:
        queue.put(("error", str(e)))

def autotune_worker(model_path, unsafe_load, system_profile, goal):
    model_obj = load_model_from_path(model_path, unsafe_load)
    import sysaware.core.autotuner as at
    return at.autotune_generator(model_obj, system_profile, goal)

def diagnose_worker(model_path, unsafe_load):
    model_obj = load_model_from_path(model_path, unsafe_load)
    import sysaware.core.diagnostic as diag
    return diag.diagnostic_generator(model_obj)

def tune_runtime_worker(model_id, source, system_profile):
    import sysaware.core.tuner as tuner
    return tuner.runtime_tune_generator(model_id, source, system_profile)

def chat_worker(port, host, messages, model_id):
    import sysaware.infrastructure.clients.ollama as ollama
    import sysaware.infrastructure.clients.lmstudio as lms
    if port == 11434:
        client = ollama.OllamaClient(host=host, port=port)
    else:
        client = lms.LMStudioClient(host=host, port=port)
    return client.chat_stream(messages, model_id)

async def run_generator_in_process(timeout_seconds, func_name, args):
    import multiprocessing
    import anyio
    
    ctx = multiprocessing.get_context("spawn")
    queue = ctx.Queue()
    process = ctx.Process(target=worker_wrapper, args=(func_name, args, queue))
    process.start()
    
    start_time = time.time()
    try:
        while True:
            remaining = timeout_seconds - (time.time() - start_time)
            if remaining <= 0:
                raise TimeoutError()
            
            # Read from queue in a thread pool to avoid blocking the main event loop
            def read_queue():
                try:
                    return queue.get(timeout=max(0.1, remaining))
                except Exception:
                    return None
            
            res = await anyio.to_thread.run_sync(read_queue)
            if res is None:
                if not process.is_alive():
                    if process.exitcode != 0:
                        raise RuntimeError(f"Worker process exited with code {process.exitcode}")
                    break
                continue
                
            status, value = res
            if status == "next":
                yield value
            elif status == "done":
                break
            elif status == "error":
                raise RuntimeError(value)
    except TimeoutError:
        yield {"status": "error", "detail": "Job execution timed out", "error": "Job execution timed out"}
    except Exception as e:
        yield {"status": "error", "detail": str(e), "error": str(e)}
    finally:
        if process.is_alive():
            process.kill()
            process.join(timeout=1.0)
            if process.is_alive():
                process.terminate()
