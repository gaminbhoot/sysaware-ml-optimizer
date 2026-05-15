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
from pathlib import Path

# Ensure the backend directory is in sys.path
sys.path.insert(0, str(Path(__file__).parent))

import core.system_profiler as sp
import core.model_analyzer as ma
import core.estimator as est
import core.strategy_engine as se
import core.prompt_optimizer as po
import core.autotuner as at
import core.store as store
import core.autodiscovery as discovery
import core.lmstudio as lms
from main import load_model_from_path

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

class LMStudioSyncRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 1234

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetry/stream")
async def stream_telemetry():
    return StreamingResponse(broker.subscribe(), media_type="text/event-stream")

@app.get("/api/telemetry/history")
async def get_telemetry_history(limit: int = 50, offset: int = 0):
    try:
        history = await anyio.to_thread.run_sync(store.get_recent_telemetry, limit, offset)
        return {"status": "success", "history": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/telemetry/history")
async def clear_telemetry(range_type: str = "all"):
    try:
        await anyio.to_thread.run_sync(store.clear_telemetry_history, range_type)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/lmstudio/sync")
async def sync_lmstudio(req: LMStudioSyncRequest):
    try:
        client = lms.LMStudioClient(host=req.host, port=req.port)
        analysis = await anyio.to_thread.run_sync(client.sync_loaded_model)
        if not analysis:
            raise HTTPException(status_code=404, detail="No loaded model found in LM Studio or connection failed")
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fleet/active")
async def get_active_nodes():
    try:
        nodes = await anyio.to_thread.run_sync(store.get_active_nodes)
        return {"status": "success", "nodes": nodes}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/fleet/node/{machine_id}")
async def delete_node(machine_id: str):
    try:
        await anyio.to_thread.run_sync(store.delete_node, machine_id)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/fleet/join/status")
async def get_join_status(machine_id: str):
    try:
        status = await anyio.to_thread.run_sync(store.get_node_join_status, machine_id)
        return {"status": status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fleet/join/approve")
async def approve_join(req: JoinRequest):
    try:
        await anyio.to_thread.run_sync(store.set_node_approval, req.machine_id, True)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/fleet/join/reject")
async def reject_join(req: JoinRequest):
    try:
        await anyio.to_thread.run_sync(store.set_node_approval, req.machine_id, False)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/telemetry/heartbeat")
async def heartbeat(req: HeartbeatRequest):
    try:
        await anyio.to_thread.run_sync(store.update_heartbeat, req.machine_id, req.hardware_profile, req.status)
        return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/telemetry/blacklist")
async def get_blacklist():
    try:
        entries = await anyio.to_thread.run_sync(store.get_blacklist)
        return {"status": "success", "blacklist": entries}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system")
async def get_system():
    try:
        profile = await anyio.to_thread.run_sync(sp.get_system_profile)
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            return {"status": "success", "path": file_path}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# --- Caching ---
_analysis_cache = {}

def get_cached_analysis(model_path: str):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    return _analysis_cache.get(cache_key)

def set_cached_analysis(model_path: str, analysis: dict):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    # Simple LRU-like behavior: clear if too large
    if len(_analysis_cache) > 20:
        _analysis_cache.clear()
    _analysis_cache[cache_key] = analysis

@app.post("/api/model/analyze")
async def analyze_model_endpoint(req: AnalyzeRequest):
    if not os.path.exists(req.model_path):
        raise HTTPException(status_code=404, detail="Model path not found")
    
    cached = get_cached_analysis(req.model_path)
    if cached:
        return {"status": "success", "analysis": cached, "cached": True}

    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        analysis = await anyio.to_thread.run_sync(ma.analyze_model, model_obj)
        set_cached_analysis(req.model_path, analysis)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/model/unload")
async def unload_model():
    return {"status": "success", "message": "Model unloaded from memory"}

@app.post("/api/optimize/baseline")
async def estimate_baseline(req: BaselineRequest):
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, False)
        baseline = await anyio.to_thread.run_sync(est.estimate_performance, model_obj, req.system_profile)
        return {"status": "success", "baseline": baseline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/strategy")
async def generate_strategy(req: StrategyRequest):
    try:
        strategy = await anyio.to_thread.run_sync(se.get_strategy, req.system_profile, req.goal, req.model_analysis)
        return {"status": "success", "strategy": strategy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prompt/optimize")
async def optimize_prompt(req: PromptRequest):
    try:
        result = await anyio.to_thread.run_sync(po.optimize_prompt, req.prompt, req.intent)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/autotune")
async def autotune_endpoint(req: AutotuneRequest):
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        best_config, _, best_result = await anyio.to_thread.run_sync(at.autotune, model_obj, req.system_profile, req.goal)
        return {
            "status": "success", 
            "best_config": best_config,
            "best_result": best_result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/autotune/stream")
async def autotune_stream_endpoint(req: AutotuneRequest):
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        
        async def event_generator():
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

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
