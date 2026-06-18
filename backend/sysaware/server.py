import uvicorn
from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import anyio
import sys
import subprocess
import json
import asyncio
import re
import time
from pathlib import Path
from huggingface_hub import HfApi

# Ensure the backend directory is in sys.path and package context is set for direct execution
if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "sysaware"
else:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

from .core import system_profiler as sp
from .core import model_analyzer as ma
from .core import estimator as est
from .core import strategy_engine as se
from .core import prompt_optimizer as po
from .core import autotuner as at
from .core import store as store
from .core import autodiscovery as discovery
from .core import lmstudio as lms
from .core import ollama as ollama
from .core import diagnostic as diag
from .core import tuner as tuner
from .cli import load_model_from_path

from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

# --- Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events."""
    # Start background tasks
    asyncio.create_task(server_heartbeat_task())
    # Start UDP Discovery Beacon on port 8000
    discovery.start_beacon(api_port=8000)
    yield
    # Cleanup if needed

app = FastAPI(title="SysAware ML Optimizer API", lifespan=lifespan)

# --- Configuration & Security ---
ENV = os.getenv("ENV") or os.getenv("SYSAWARE_ENV") or "development"
IS_PRODUCTION = ENV.lower() == "production"

# 1. API Authentication Key
SYSAWARE_API_KEY = os.getenv("SYSAWARE_API_KEY")
if not SYSAWARE_API_KEY and IS_PRODUCTION:
    import secrets
    SYSAWARE_API_KEY = "sysaware_" + secrets.token_hex(16)
    print("\n" + "!" * 60)
    print(f"PRODUCTION WARNING: No SYSAWARE_API_KEY was provided.")
    print(f"Generated a secure random API key for this session:")
    print(f"  {SYSAWARE_API_KEY}")
    print("Please set SYSAWARE_API_KEY in your environment to use a persistent key.")
    print("!" * 60 + "\n")

# 2. Host Bind Config
SYSAWARE_BIND = os.getenv("SYSAWARE_BIND", "127.0.0.1")

# 3. CORS Origins
cors_origins_env = os.getenv("SYSAWARE_CORS_ORIGINS")
if cors_origins_env:
    CORS_ORIGINS = [orig.strip() for orig in cors_origins_env.split(",") if orig.strip()]
else:
    CORS_ORIGINS = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

# 4. Allowed Proxy Hosts
allowed_proxies_env = os.getenv("SYSAWARE_ALLOWED_PROXIES")
if allowed_proxies_env:
    ALLOWED_PROXIES = [h.strip() for h in allowed_proxies_env.split(",") if h.strip()]
else:
    ALLOWED_PROXIES = ["127.0.0.1", "localhost"]

# 5. Allowed Model Directories
allowed_model_dirs_env = os.getenv("SYSAWARE_ALLOWED_MODEL_DIRS")
if allowed_model_dirs_env:
    ALLOWED_MODEL_DIRS = [os.path.realpath(d.strip()) for d in allowed_model_dirs_env.split(",") if d.strip()]
else:
    # Allow workspace directory and current working directory
    ALLOWED_MODEL_DIRS = [
        os.path.realpath(os.getcwd()),
        os.path.realpath(os.path.dirname(os.path.abspath(__file__)))
    ]

# 6. Unsafe Load Allow
SYSAWARE_ALLOW_UNSAFE_LOAD = os.getenv("SYSAWARE_ALLOW_UNSAFE_LOAD", "false").lower() == "true"

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Rate Limiting & Concurrency Infrastructure ---
import collections
from fastapi.responses import JSONResponse

class SimpleRateLimiter:
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests = collections.defaultdict(list) # client_ip -> list of timestamps
        
    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < 60]
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False
        self.requests[client_ip].append(now)
        return True

expensive_limiter = SimpleRateLimiter(requests_per_minute=20)
telemetry_limiter = SimpleRateLimiter(requests_per_minute=60)
general_limiter = SimpleRateLimiter(requests_per_minute=120)

class ConcurrencyTracker:
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.active_count = 0
        self.lock = asyncio.Lock()
        
    async def acquire(self) -> bool:
        async with self.lock:
            if self.active_count >= self.max_concurrent:
                return False
            self.active_count += 1
            return True
            
    async def release(self):
        async with self.lock:
            self.active_count = max(0, self.active_count - 1)

model_concurrency = ConcurrencyTracker(max_concurrent=3)
chat_concurrency = ConcurrencyTracker(max_concurrent=5)

# --- Payload Size, Rate Limit, and Auth Middlewares ---
MAX_PAYLOAD_SIZES = {
    "/api/model/registry": 50 * 1024 * 1024, # 50 MB
}
DEFAULT_MAX_PAYLOAD_SIZE = 2 * 1024 * 1024 # 2 MB

EXPENSIVE_ROUTES = [
    "/api/chat/stream",
    "/api/diagnose/custom/stream",
    "/api/optimize/autotune",
    "/api/optimize/autotune/stream",
    "/api/model/analyze",
    "/api/fleet/join/request"
]

TELEMETRY_ROUTES = [
    "/api/telemetry/ingest",
    "/api/telemetry/heartbeat"
]

ADMIN_ROUTES = [
    "/api/fleet/join/approve",
    "/api/fleet/join/reject",
    "/api/fleet/node",  # delete node
    "/api/telemetry/history",
    "/api/telemetry/blacklist"
]

@app.middleware("http")
async def security_middleware(request: Request, call_next):
    path = request.url.path
    client_ip = request.client.host if request.client else "unknown"
    
    # 1. Payload Size Check
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                max_size = MAX_PAYLOAD_SIZES.get(path, DEFAULT_MAX_PAYLOAD_SIZE)
                if length > max_size:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request payload too large. Max allowed is {max_size} bytes."}
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})

    # Only secure /api routes except /api/system
    if path.startswith("/api") and path != "/api/system":
        # 2. Authentication Check
        provided_key = request.headers.get("X-API-Key")
        if not provided_key:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                provided_key = auth_header[7:]
        if not provided_key:
            provided_key = request.query_params.get("token") or request.query_params.get("api_key")
            
        if SYSAWARE_API_KEY:
            sysaware_admin_key = os.getenv("SYSAWARE_ADMIN_KEY") or SYSAWARE_API_KEY
            if provided_key != SYSAWARE_API_KEY and provided_key != sysaware_admin_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized: Invalid or missing API key."}
                )
                
            # If it is an admin route, check admin key
            is_admin_route = any(path.startswith(r) for r in ADMIN_ROUTES)
            if is_admin_route:
                if provided_key != sysaware_admin_key:
                    return JSONResponse(
                        status_code=403,
                        content={"detail": "Forbidden: Admin privileges required."}
                    )

        # 3. Rate Limiting Check
        if any(path.startswith(r) for r in EXPENSIVE_ROUTES):
            if not expensive_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down on expensive routes."}
                )
        elif any(path.startswith(r) for r in TELEMETRY_ROUTES):
            if not telemetry_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Telemetry rate limit exceeded."}
                )
        else:
            if not general_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded."}
                )

    return await call_next(request)

# --- Helper Functions ---
def is_path_allowed(model_path: str) -> bool:
    try:
        resolved_path = os.path.realpath(model_path)
        for allowed_dir in ALLOWED_MODEL_DIRS:
            common = os.path.commonpath([resolved_path, allowed_dir])
            if common == allowed_dir:
                return True
        return False
    except Exception:
        return False

def validate_model_path_and_load(model_path: str, unsafe_load: bool = False):
    if not is_path_allowed(model_path):
        raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
    if unsafe_load and not SYSAWARE_ALLOW_UNSAFE_LOAD:
        raise HTTPException(status_code=400, detail="Unsafe model loading is disabled on this server.")

def validate_host_and_port(host: str, port: int):
    host_clean = host.strip().lower()
    if host_clean in ALLOWED_PROXIES:
        return
    if host_clean in ["localhost", "127.0.0.1", "::1"]:
        return
    try:
        import socket
        ip = socket.gethostbyname(host_clean)
        if ip in ["127.0.0.1", "::1"]:
            return
    except Exception:
        pass
    raise HTTPException(status_code=400, detail=f"Access denied: Host '{host}' is not in the proxy allowlist.")

def handle_api_exception(e: Exception):
    print(f"API Exception: {e}")
    import traceback
    traceback.print_exc()
    if isinstance(e, HTTPException):
        raise e
    if IS_PRODUCTION:
        raise HTTPException(status_code=500, detail="An internal server error occurred.")
    else:
        raise HTTPException(status_code=500, detail=str(e))

# Initialize DB
store.init_db()

# --- SSE Broker ---
class EventBroker:
    def __init__(self):
        self.listeners = set()

    async def subscribe(self):
        queue = asyncio.Queue()
        self.listeners.add(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self.listeners.remove(queue)

    async def publish(self, data: dict):
        msg = f"data: {json.dumps(data)}\n\n"
        for queue in self.listeners:
            await queue.put(msg)

broker = EventBroker()

# --- Models ---
class AnalyzeRequest(BaseModel):
    model_path: str
    unsafe_load: bool = False

class BaselineRequest(BaseModel):
    model_path: str
    system_profile: dict

class StrategyRequest(BaseModel):
    system_profile: dict
    goal: str
    model_analysis: dict = None

class PromptRequest(BaseModel):
    prompt: str
    intent: str = "general"

class AutotuneRequest(BaseModel):
    model_path: str
    system_profile: dict
    goal: str
    unsafe_load: bool = False

class HeartbeatRequest(BaseModel):
    machine_id: str
    hardware_profile: dict | None = None
    status: str = "idle"

class BlacklistEntry(BaseModel):
    machine_id: str
    backend: str
    reason: str

class JoinRequest(BaseModel):
    machine_id: str

class TelemetryReport(BaseModel):
    machine_id: str
    model_hash: str = "unknown"
    hardware_profile: dict
    goal: str
    latency_range: list[float]
    memory_mb: float
    decode_tokens_per_sec: float | None = None
    prefill_latency_ms: float | None = None

class ModelRegisterRequest(BaseModel):
    model_hash: str
    model_name: str
    reference_latency: float
    reference_memory_mb: float
    reference_throughput: float = 0.0
    metadata: dict = None

class DriftRequest(BaseModel):
    model_hash: str
    current_latency: float
    current_throughput: float | None = None

class LMStudioSyncRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 1234
    model_id: str | None = None

class ModelLoadRequest(BaseModel):
    model_id: str
    host: str = "127.0.0.1"
    port: int = 1234

class UnloadRequest(BaseModel):
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 1234

class OllamaSyncRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 11434
    model_id: str | None = None

class OllamaLoadRequest(BaseModel):
    model_id: str
    host: str = "127.0.0.1"
    port: int = 11434

class OllamaUnloadRequest(BaseModel):
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 11434

class DiagnosticRequest(BaseModel):
    model_path: str
    unsafe_load: bool = False

class RuntimeTuneRequest(BaseModel):
    model_id: str
    source: str  # lms, ollama, olx
    system_profile: dict

class InferenceEstimateRequest(BaseModel):
    hardware_specs: dict
    model_metadata: dict

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 1234
    stream: bool = True

# --- Background Tasks ---
async def server_heartbeat_task():
    """Periodically sends a heartbeat for the machine running the server."""
    machine_id = f"{os.uname().nodename}_{os.uname().sysname}" if hasattr(os, "uname") else f"{os.environ.get('COMPUTERNAME', 'server')}_windows"
    machine_id += "_local_server"
    
    # Simple profile for the server node
    profile = sp.get_system_profile()
    
    while True:
        try:
            # We call the store directly since we're in the same process
            await anyio.to_thread.run_sync(store.update_heartbeat, machine_id, profile, "idle")
        except Exception as e:
            print(f"Error in server heartbeat: {e}")
        await asyncio.sleep(30)

# --- API Routes ---
@app.post("/api/telemetry/ingest")
async def ingest_telemetry(report: TelemetryReport):
    try:
        # Save to SQLite
        await anyio.to_thread.run_sync(
            store.insert_telemetry,
            report.machine_id,
            report.hardware_profile,
            report.goal,
            report.latency_range,
            report.memory_mb,
            report.model_hash,
            report.decode_tokens_per_sec,
            report.prefill_latency_ms
        )
        # Broadcast via SSE
        await broker.publish({
            "type": "telemetry",
            "data": report.model_dump()
        })
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/telemetry/stream")
async def stream_telemetry():
    return StreamingResponse(broker.subscribe(), media_type="text/event-stream")

@app.get("/api/telemetry/history")
async def get_telemetry_history(limit: int = 50, offset: int = 0):
    try:
        history = await anyio.to_thread.run_sync(store.get_recent_telemetry, limit, offset)
        return {"status": "success", "history": history}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/model/registry")
async def register_model(req: ModelRegisterRequest):
    """Registers a model baseline for drift monitoring."""
    try:
        await anyio.to_thread.run_sync(
            store.register_reference_model,
            req.model_hash,
            req.model_name,
            req.reference_latency,
            req.reference_memory_mb,
            req.reference_throughput,
            req.metadata
        )
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/model/drift")
async def check_drift(req: DriftRequest):
    """Checks for performance drift against the registered baseline."""
    try:
        result = await anyio.to_thread.run_sync(
            store.detect_drift,
            req.model_hash,
            req.current_latency,
            req.current_throughput
        )
        return result
    except Exception as e:
        handle_api_exception(e)

@app.delete("/api/telemetry/history")
async def clear_telemetry(range_type: str = "all"):
    try:
        await anyio.to_thread.run_sync(store.clear_telemetry_history, range_type)
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/lmstudio/sync")
async def sync_lmstudio(req: LMStudioSyncRequest):
    print(f"\n--- LM STUDIO SYNC ATTEMPT ---")
    print(f"Target: {req.host}:{req.port}")
    try:
        validate_host_and_port(req.host, req.port)
        client = lms.LMStudioClient(host=req.host, port=req.port)
        analysis = await anyio.to_thread.run_sync(client.sync_loaded_model, req.model_id)
        if not analysis:
            print(f"Sync Result: FAIL - No active model detected.")
            raise HTTPException(status_code=404, detail=f"No loaded model found in LM Studio at {req.host}:{req.port}. Check if 'Local Server' is ON and a model is loaded.")
        print(f"Sync Result: SUCCESS - Active model: {analysis['model_name']}")
        print(f"-------------------------------\n")
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        if isinstance(e, HTTPException): 
            print(f"Sync Result: HTTP ERROR - {e.detail}")
            raise e
        print(f"Sync Result: UNEXPECTED ERROR - {str(e)}")
        print(f"-------------------------------\n")
        handle_api_exception(e)

@app.get("/api/lmstudio/models")
async def list_lmstudio_models(host: str = "127.0.0.1", port: int = 1234):
    try:
        validate_host_and_port(host, port)
        client = lms.LMStudioClient(host=host, port=port)
        models = await anyio.to_thread.run_sync(client.get_all_models)
        return {"status": "success", "models": models}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/lmstudio/load")
async def load_lmstudio_model(req: ModelLoadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        client = lms.LMStudioClient(host=req.host, port=req.port)
        success = await anyio.to_thread.run_sync(client.load_model, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to load model in LM Studio")
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/lmstudio/unload")
async def unload_lmstudio_model(req: UnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        client = lms.LMStudioClient(host=req.host, port=req.port)
        success = await anyio.to_thread.run_sync(client.unload_model, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to unload model in LM Studio")
    except Exception as e:
        handle_api_exception(e)

# --- Ollama Endpoints ---
@app.post("/api/ollama/sync")
async def sync_ollama(req: OllamaSyncRequest):
    print(f"\n--- OLLAMA SYNC ATTEMPT ---")
    print(f"Target: {req.host}:{req.port}")
    try:
        validate_host_and_port(req.host, req.port)
        client = ollama.OllamaClient(host=req.host, port=req.port)
        analysis = await anyio.to_thread.run_sync(client.sync_loaded_model, req.model_id)
        if not analysis:
            print(f"Sync Result: FAIL - No loaded model detected.")
            raise HTTPException(status_code=404, detail=f"No loaded model found in Ollama at {req.host}:{req.port}. Check if Ollama is running and a model is loaded.")
        print(f"Sync Result: SUCCESS - Active model: {analysis['model_name']}")
        print(f"---------------------------\n")
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        if isinstance(e, HTTPException):
            print(f"Sync Result: HTTP ERROR - {e.detail}")
            raise e
        print(f"Sync Result: UNEXPECTED ERROR - {str(e)}")
        print(f"---------------------------\n")
        handle_api_exception(e)

@app.get("/api/ollama/models")
async def list_ollama_models(host: str = "127.0.0.1", port: int = 11434):
    try:
        validate_host_and_port(host, port)
        client = ollama.OllamaClient(host=host, port=port)
        models = await anyio.to_thread.run_sync(client.get_all_models)
        return {"status": "success", "models": models}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/ollama/load")
async def load_ollama_model(req: OllamaLoadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        client = ollama.OllamaClient(host=req.host, port=req.port)
        success = await anyio.to_thread.run_sync(client.load_model, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to load model in Ollama")
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/ollama/unload")
async def unload_ollama_model(req: OllamaUnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        client = ollama.OllamaClient(host=req.host, port=req.port)
        success = await anyio.to_thread.run_sync(client.unload_model, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=500, detail="Failed to unload model in Ollama")
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/fleet/active")
async def get_active_nodes():
    try:
        nodes = await anyio.to_thread.run_sync(store.get_active_nodes)
        return {"status": "success", "nodes": nodes}
    except Exception as e:
        handle_api_exception(e)

@app.delete("/api/fleet/node/{machine_id}")
async def delete_node(machine_id: str):
    try:
        await anyio.to_thread.run_sync(store.delete_node, machine_id)
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/fleet/join/request")
async def request_join(req: JoinRequest):
    try:
        await anyio.to_thread.run_sync(store.create_join_request, req.machine_id)
        # Broadcast to dashboard
        await broker.publish({
            "type": "join_request",
            "machine_id": req.machine_id
        })
        return {"status": "pending"}
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/fleet/join/status")
async def get_join_status(machine_id: str):
    try:
        status = await anyio.to_thread.run_sync(store.get_node_join_status, machine_id)
        return {"status": status}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/fleet/join/approve")
async def approve_join(req: JoinRequest, request: Request):
    try:
        caller_machine_id = request.headers.get("X-Machine-ID")
        if caller_machine_id and caller_machine_id == req.machine_id:
            raise HTTPException(status_code=400, detail="Nodes cannot approve their own join requests.")
        await anyio.to_thread.run_sync(store.set_node_approval, req.machine_id, True)
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/fleet/join/reject")
async def reject_join(req: JoinRequest, request: Request):
    try:
        caller_machine_id = request.headers.get("X-Machine-ID")
        if caller_machine_id and caller_machine_id == req.machine_id:
            raise HTTPException(status_code=400, detail="Nodes cannot reject their own join requests.")
        await anyio.to_thread.run_sync(store.set_node_approval, req.machine_id, False)
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/telemetry/heartbeat")
async def heartbeat(req: HeartbeatRequest):
    try:
        await anyio.to_thread.run_sync(store.update_heartbeat, req.machine_id, req.hardware_profile, req.status)
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/telemetry/blacklist")
async def get_blacklist():
    try:
        entries = await anyio.to_thread.run_sync(store.get_blacklist)
        return {"status": "success", "blacklist": entries}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/telemetry/blacklist")
async def add_to_blacklist(entry: BlacklistEntry):
    try:
        await anyio.to_thread.run_sync(store.add_to_blacklist, entry.machine_id, entry.backend, entry.reason)
        # Also broadcast via SSE
        await broker.publish({
            "type": "blacklist",
            "data": entry.model_dump()
        })
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/system")
async def get_system():
    try:
        profile = await anyio.to_thread.run_sync(sp.get_system_profile)
        return {"status": "success", "profile": profile}
    except Exception as e:
        handle_api_exception(e)

@app.get("/api/model/browse")
async def browse_model():
    try:
        if sys.platform == "darwin":
            def run_osascript():
                script = 'POSIX path of (choose file with prompt "Select PyTorch Model:")'
                return subprocess.run(
                    ['osascript', '-e', script],
                    capture_output=True, text=True, check=True
                )
            try:
                result = await anyio.to_thread.run_sync(run_osascript)
                file_path = result.stdout.strip()
                # Ensure path is allowed
                if not is_path_allowed(file_path):
                    raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
                return {"status": "success", "path": file_path}
            except subprocess.CalledProcessError as e:
                return {"status": "cancelled", "detail": e.stderr}
        else:
            def tk_browse():
                try:
                    import tkinter as tk
                    from tkinter import filedialog
                    root = tk.Tk()
                    root.withdraw()
                    root.wm_attributes('-topmost', 1)
                    file_path = filedialog.askopenfilename(master=root, filetypes=[("PyTorch Models", "*.pt *.pth"), ("All Files", "*.*")])
                    root.destroy()
                    return file_path
                except Exception:
                    return ""
            file_path = await anyio.to_thread.run_sync(tk_browse)
            if file_path and not is_path_allowed(file_path):
                raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
            return {"status": "success", "path": file_path}
    except Exception as e:
        handle_api_exception(e)

# --- Caching ---
_analysis_cache = {}

def get_cached_analysis(model_path: str):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    return _analysis_cache.get(cache_key)

def set_cached_analysis(model_path: str, analysis: dict):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    if len(_analysis_cache) > 20:
        _analysis_cache.clear()
    _analysis_cache[cache_key] = analysis

@app.post("/api/model/analyze")
async def analyze_model_endpoint(req: AnalyzeRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    
    if not os.path.exists(req.model_path):
        if IS_PRODUCTION:
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            raise HTTPException(status_code=404, detail="Model path not found")
        
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    try:
        cached = get_cached_analysis(req.model_path)
        if cached:
            return {"status": "success", "analysis": cached, "cached": True}
    
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        analysis = await anyio.to_thread.run_sync(ma.analyze_model, model_obj)
        set_cached_analysis(req.model_path, analysis)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        if IS_PRODUCTION:
            print(f"Model analysis failed: {e}")
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            handle_api_exception(e)
    finally:
        await model_concurrency.release()

@app.post("/api/model/unload")
async def unload_model(req: UnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        if req.port == 11434:
            client = ollama.OllamaClient(host=req.host, port=req.port)
            await anyio.to_thread.run_sync(client.unload_model, req.model_id)
            return {"status": "success", "message": f"Model {req.model_id or ''} unloaded from Ollama memory"}
        else:
            client = lms.LMStudioClient(host=req.host, port=req.port)
            await anyio.to_thread.run_sync(client.unload_model, req.model_id)
            return {"status": "success", "message": f"Model {req.model_id or ''} unloaded from LM Studio memory"}
    except Exception as e:
        print(f"Model Unload failed: {e}")
        # Return failure exception instead of hiding it
        raise HTTPException(status_code=500, detail=f"Model unload failed: {str(e)}")

@app.post("/api/optimize/baseline")
async def estimate_baseline(req: BaselineRequest):
    validate_model_path_and_load(req.model_path, False)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, False)
        baseline = await anyio.to_thread.run_sync(est.estimate_performance, model_obj, req.system_profile)
        return {"status": "success", "baseline": baseline}
    except Exception as e:
        handle_api_exception(e)
    finally:
        await model_concurrency.release()

@app.post("/api/optimize/strategy")
async def generate_strategy(req: StrategyRequest):
    try:
        strategy = await anyio.to_thread.run_sync(se.get_strategy, req.system_profile, req.goal, req.model_analysis)
        return {"status": "success", "strategy": strategy}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/prompt/optimize")
async def optimize_prompt(req: PromptRequest):
    try:
        result = await anyio.to_thread.run_sync(po.optimize_prompt, req.prompt, req.intent)
        return {"status": "success", "result": result}
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/optimize/autotune")
async def autotune_endpoint(req: AutotuneRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        best_config, _, best_result = await anyio.to_thread.run_sync(at.autotune, model_obj, req.system_profile, req.goal)
        return {
            "status": "success", 
            "best_config": best_config,
            "best_result": best_result
        }
    except Exception as e:
        handle_api_exception(e)
    finally:
        await model_concurrency.release()

@app.post("/api/optimize/autotune/stream")
async def autotune_stream_endpoint(req: AutotuneRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    async def event_generator():
        try:
            model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
            gen = at.autotune_generator(model_obj, req.system_profile, req.goal)
            while True:
                try:
                    update = await anyio.to_thread.run_sync(next, gen)
                    yield f"data: {json.dumps(update)}\n\n"
                except StopIteration:
                    break
                except Exception as e:
                    yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"
                    break
        finally:
            await model_concurrency.release()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/diagnose/custom/stream")
async def diagnose_custom_stream(req: DiagnosticRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    async def event_generator():
        try:
            model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
            gen = diag.diagnostic_generator(model_obj)
            while True:
                def safe_next():
                    try:
                        return next(gen)
                    except StopIteration:
                        return None
                try:
                    update = await anyio.to_thread.run_sync(safe_next)
                    if update is None:
                        break
                    yield f"data: {json.dumps(update)}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"
                    break
        finally:
            await model_concurrency.release()
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.post("/api/tune/runtime/stream")
async def tune_runtime_stream(req: RuntimeTuneRequest):
    try:
        async def event_generator():
            gen = tuner.runtime_tune_generator(req.model_id, req.source, req.system_profile)
            while True:
                def safe_next():
                    try:
                        return next(gen)
                    except StopIteration:
                        return None
                try:
                    update = await anyio.to_thread.run_sync(safe_next)
                    if update is None:
                        break
                    yield f"data: {json.dumps(update)}\n\n"
                except Exception as e:
                    yield f"data: {json.dumps({'status': 'error', 'detail': str(e)})}\n\n"
                    break
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/estimate/inference")
async def estimate_inference(req: InferenceEstimateRequest):
    try:
        result = await anyio.to_thread.run_sync(est.predict_inference_speed, req.hardware_specs, req.model_metadata)
        result["status"] = "success"
        return result
    except Exception as e:
        handle_api_exception(e)

@app.post("/api/chat/stream")
async def chat_stream(req: ChatRequest):
    validate_host_and_port(req.host, req.port)
    if not await chat_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent chat streams reached.")
    
    try:
        if req.port == 11434:
            client = ollama.OllamaClient(host=req.host, port=req.port)
        else:
            client = lms.LMStudioClient(host=req.host, port=req.port)
        messages = [{"role": m.role, "content": msg_content_filter(m.content)} for m in req.messages]
        
        async def event_generator():
            try:
                gen = client.chat_stream(messages, req.model_id)
                while True:
                    def safe_next():
                        try:
                            return next(gen)
                        except StopIteration:
                            return None
                    try:
                        update = await anyio.to_thread.run_sync(safe_next)
                        if update is None:
                            break
                        yield f"data: {json.dumps(update)}\n\n"
                    except Exception as e:
                        yield f"data: {json.dumps({'error': str(e)})}\n\n"
                        break
                
                yield f"data: {json.dumps({'status': 'done'})}\n\n"
            finally:
                await chat_concurrency.release()

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        await chat_concurrency.release()
        handle_api_exception(e)

def msg_content_filter(content: str) -> str:
    """Optional: strip frontend-only markers if any."""
    return content.strip()

# --- Dynamic Recommendations Cache and Helpers ---
_RECOMMENDATIONS_CACHE = {}
_CACHE_EXPIRY_SECONDS = 3600

FALLBACK_MODELS = [
    {
        "repo_id": "mlx-community/Llama-3.2-3B-Instruct-4bit",
        "name": "Llama 3.2 3B Instruct",
        "size": "3B",
        "format": "MLX (Apple Silicon)",
        "description": "Meta's highly capable lightweight model, optimized for mobile & edge devices on Apple Silicon.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/mlx-community/Llama-3.2-3B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Phi-3.5-mini-instruct-4bit",
        "name": "Phi 3.5 Mini",
        "size": "3.8B",
        "format": "MLX (Apple Silicon)",
        "description": "Microsoft's state-of-the-art small language model with incredible reasoning for its size.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/mlx-community/Phi-3.5-mini-instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Meta-Llama-3-8B-Instruct-4bit",
        "name": "Llama 3 8B Instruct",
        "size": "8B",
        "format": "MLX (Apple Silicon)",
        "description": "The gold standard for 8B models. Superb dialogue, instruction following, and general reasoning.",
        "ramNeeded": 6,
        "link": "https://huggingface.co/mlx-community/Meta-Llama-3-8B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Gemma-2-9b-it-4bit",
        "name": "Gemma 2 9B IT",
        "size": "9B",
        "format": "MLX (Apple Silicon)",
        "description": "Google's ultra-efficient 9B model, known for clean outputs and strong factual accuracy.",
        "ramNeeded": 7,
        "link": "https://huggingface.co/mlx-community/Gemma-2-9b-it-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-7B-Instruct-4bit",
        "name": "Qwen 2.5 7B Instruct",
        "size": "7B",
        "format": "MLX (Apple Silicon)",
        "description": "Outstanding multilingual capability and strong coding/math intelligence.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-7B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit",
        "name": "Mistral NeMo 12B",
        "size": "12B",
        "format": "MLX (Apple Silicon)",
        "description": "Collaborative effort between NVIDIA and Mistral. State-of-the-art for its size.",
        "ramNeeded": 9,
        "link": "https://huggingface.co/mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-14B-Instruct-4bit",
        "name": "Qwen 2.5 14B Instruct",
        "size": "14B",
        "format": "MLX (Apple Silicon)",
        "description": "High-performance model bridging the gap between lightweight edge and server-class reasoning.",
        "ramNeeded": 10,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-14B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-32B-Instruct-4bit",
        "name": "Qwen 2.5 32B Instruct",
        "size": "32B",
        "format": "MLX (Apple Silicon)",
        "description": "Server-class reasoning capabilities, offering highly detailed responses and complex coding skills.",
        "ramNeeded": 21,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-32B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Meta-Llama-3-70B-Instruct-4bit",
        "name": "Llama 3 70B Instruct",
        "size": "70B",
        "format": "MLX (Apple Silicon)",
        "description": "State-of-the-art open weight reasoning and comprehension model. Requires massive unified memory.",
        "ramNeeded": 44,
        "link": "https://huggingface.co/mlx-community/Meta-Llama-3-70B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-72B-Instruct-4bit",
        "name": "Qwen 2.5 72B Instruct",
        "size": "72B",
        "format": "MLX (Apple Silicon)",
        "description": "Maximum reasoning performance for deep logic, complex coding, and specialized research.",
        "ramNeeded": 45,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-72B-Instruct-4bit"
    },
    {
        "repo_id": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
        "name": "Llama 3 8B Instruct",
        "size": "8B",
        "format": "GGUF (Cross-platform)",
        "description": "Perfect for LM Studio integration on Windows/Linux with CUDA or CPU backend.",
        "ramNeeded": 6,
        "link": "https://huggingface.co/lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
        "name": "Mistral 7B v0.3",
        "size": "7B",
        "format": "GGUF (Cross-platform)",
        "description": "Reliable and efficient 7B baseline. Excellent for general utility and summarization.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Phi-3.5-mini-instruct-GGUF",
        "name": "Phi 3.5 Mini",
        "size": "3.8B",
        "format": "GGUF (Cross-platform)",
        "description": "Highly efficient reasoning in a compact GGUF format for cross-platform hardware.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/lmstudio-community/Phi-3.5-mini-instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Qwen2.5-7B-Instruct-GGUF",
        "name": "Qwen 2.5 7B Instruct",
        "size": "7B",
        "format": "GGUF (Cross-platform)",
        "description": "Outstanding multilingual capability. Runs extremely well on standard GPUs or CPU threads.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/lmstudio-community/Qwen2.5-7B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Llama-3.2-3B-Instruct-GGUF",
        "name": "Llama 3.2 3B Instruct",
        "size": "3B",
        "format": "GGUF (Cross-platform)",
        "description": "Highly optimized lightweight model. Runs smoothly on laptops with lower VRAM or RAM specs.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Qwen2.5-14B-Instruct-GGUF",
        "name": "Qwen 2.5 14B Instruct",
        "size": "14B",
        "format": "GGUF (Cross-platform)",
        "description": "Excellent model for detailed code generation and multi-step reasoning tasks.",
        "ramNeeded": 10,
        "link": "https://huggingface.co/lmstudio-community/Qwen2.5-14B-Instruct-GGUF"
    },
    {
        "repo_id": "bartowski/gemma-2-27b-it-GGUF",
        "name": "Gemma 2 27B IT",
        "size": "27B",
        "format": "GGUF (Cross-platform)",
        "description": "Google's high-efficiency model, punching way above its weight in reasoning tasks.",
        "ramNeeded": 18,
        "link": "https://huggingface.co/bartowski/gemma-2-27b-it-GGUF"
    },
    {
        "repo_id": "MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF",
        "name": "Llama 3.1 70B Instruct",
        "size": "70B",
        "format": "GGUF (Cross-platform)",
        "description": "Massive reasoning model. Requires high-end multi-GPU setups or significant system RAM.",
        "ramNeeded": 44,
        "link": "https://huggingface.co/MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF"
    }
]

def format_model_name(repo_id: str) -> str:
    name = repo_id.split('/')[-1]
    suffixes = [
        '-4bit', '-8bit', '-2bit', '-GGUF', '-gguf', '_GGUF', '_gguf', 
        '-it', '-Instruct', '-instruct', '-qat', '-OptiQ', '-mlx', 
        '-DQ3_K_M', '-q8', '-Q8', '-MXFP4-Q8', '-MXFP4_MOE', '-Q8_0',
        '-IQ4_XS'
    ]
    changed = True
    while changed:
        changed = False
        for s in suffixes:
            if name.endswith(s):
                name = name[:-len(s)]
                changed = True
    name = name.replace('-', ' ').replace('_', ' ')
    return name.strip()

def get_model_size(repo_id: str) -> str:
    match = re.search(r'\b(\d+x)?\d+(\.\d+)?[mMbB]\b', repo_id)
    if match:
        return match.group(0).upper()
    match = re.search(r'(\d+x)?\d+(\.\d+)?[mMbB]', repo_id)
    if match:
        return match.group(0).upper()
    return "Unknown"

def estimate_ram_needed(repo_id: str) -> int:
    size_str = get_model_size(repo_id)
    if size_str == "Unknown":
        return 4
    
    try:
        val = size_str.lower()
        if 'x' in val:
            parts = val.split('x')
            num = float(parts[0]) * float(parts[1].replace('b', '').replace('m', ''))
        elif 'b' in val:
            num = float(val.replace('b', ''))
        elif 'm' in val:
            num = float(val.replace('m', '')) / 1000.0
        else:
            num = float(val)
    except Exception:
        return 4
        
    is_4bit = any(x in repo_id.lower() for x in ["4bit", "q4", "iq4"])
    is_8bit = any(x in repo_id.lower() for x in ["8bit", "q8"])
    
    if is_4bit:
        ram = int(num * 0.6) + 1.5
    elif is_8bit:
        ram = int(num * 1.1) + 1.5
    else:
        ram = int(num * 0.6) + 1.5
        
    return max(round(ram), 2)

def generate_description(repo_id: str, downloads: int, likes: int) -> str:
    author = repo_id.split('/')[0]
    size = get_model_size(repo_id)
    desc = f"Popular {size} model by {author}."
    if downloads > 1000:
        desc += f" Over {downloads // 1000}k downloads on Hugging Face."
    elif downloads > 0:
        desc += f" {downloads} downloads on Hugging Face."
    return desc

@app.get("/api/models/recommendations")
async def get_recommendations():
    global _RECOMMENDATIONS_CACHE
    try:
        now = time.time()
        profile = await anyio.to_thread.run_sync(sp.get_system_profile)
        is_mac = "darwin" in profile.get("os", "").lower() or "mac" in profile.get("os", "").lower()
        is_metal = profile.get("gpu_backend", "").lower() in ["metal", "mps"] or is_mac
        
        cache_key = "mlx" if is_metal else "gguf"
        
        if cache_key in _RECOMMENDATIONS_CACHE:
            cached = _RECOMMENDATIONS_CACHE[cache_key]
            if now - cached["timestamp"] < _CACHE_EXPIRY_SECONDS:
                return {"status": "success", "recommendations": cached["data"]}
                
        def fetch_from_hf():
            api = HfApi()
            results = []
            
            if is_metal:
                models = api.list_models(
                    author="mlx-community",
                    filter="text-generation",
                    sort="downloads",
                    limit=30,
                    expand=["downloads", "likes"]
                )
                fmt = "MLX (Apple Silicon)"
            else:
                models = api.list_models(
                    filter=["gguf", "text-generation"],
                    sort="downloads",
                    limit=30,
                    expand=["downloads", "likes"]
                )
                fmt = "GGUF (Cross-platform)"
                
            for m in models:
                if not m.id:
                    continue
                downloads = getattr(m, "downloads", 0) or 0
                likes = getattr(m, "likes", 0) or 0
                
                if downloads < 100:
                    continue
                    
                size = get_model_size(m.id)
                if size == "Unknown":
                    continue
                    
                ram_needed = estimate_ram_needed(m.id)
                name = format_model_name(m.id)
                desc = generate_description(m.id, downloads, likes)
                
                results.append({
                    "repo_id": m.id,
                    "name": name,
                    "size": size,
                    "format": fmt,
                    "description": desc,
                    "ramNeeded": ram_needed,
                    "link": f"https://huggingface.co/{m.id}"
                })
            
            # Sort by downloads descending
            results.sort(key=lambda x: x.get("downloads", 0), reverse=True)
            return results

        try:
            recs = await anyio.to_thread.run_sync(fetch_from_hf)
            if not recs:
                recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
        except Exception as hf_err:
            print(f"Failed to fetch from HF Hub: {hf_err}, using fallback models.")
            recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
            
        _RECOMMENDATIONS_CACHE[cache_key] = {
            "timestamp": now,
            "data": recs
        }
        
        return {"status": "success", "recommendations": recs}
        
    except Exception as e:
        try:
            profile = await anyio.to_thread.run_sync(sp.get_system_profile)
            is_mac = "darwin" in profile.get("os", "").lower() or "mac" in profile.get("os", "").lower()
            is_metal = profile.get("gpu_backend", "").lower() in ["metal", "mps"] or is_mac
            recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
            return {"status": "success", "recommendations": recs}
        except Exception:
            return {"status": "success", "recommendations": FALLBACK_MODELS[:6]}

# --- Serve React Frontend ---
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    async def index():
        return {
            "message": "API is running. However, the React frontend is not built yet.",
            "instructions": "Navigate to /frontend and run 'npm install' then 'npm run build'."
        }

if __name__ == "__main__":
    import socket
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "0.0.0.0"
    
    print(f"\n" + "="*50)
    print(f"SYSAWARE ML OPTIMIZER SERVER ACTIVE")
    print(f"Local Access:   http://localhost:8000")
    print(f"Network Access: http://{local_ip}:8000")
    print(f"UDP Discovery:  Port 8001")
    print("="*50)
    print("TIP: For LM Studio sync, ensure 'Local Server' is ON.")
    print("TIP: If telemetry fails, check firewall for Port 8000 (TCP) and 8001 (UDP).")
    print("="*50 + "\n")
    uvicorn.run(app, host=SYSAWARE_BIND, port=8000, log_level="info")
