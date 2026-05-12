import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import anyio
import core.system_profiler as sp
import core.model_analyzer as ma
import core.estimator as est
import core.strategy_engine as se
import core.prompt_optimizer as po
import core.autotuner as at
from main import load_model_from_path

app = FastAPI(title="SysAware ML Optimizer API")

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

# --- API Routes ---
@app.get("/api/system")
async def get_system():
    try:
        # System profiling is usually fast but involves subprocesses/IORegistry on Darwin
        profile = await anyio.to_thread.run_sync(sp.get_system_profile)
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/model/browse")
async def browse_model():
    try:
        if sys.platform == "darwin":
            # Using anyio.to_thread.run_sync to avoid blocking the event loop
            def run_osascript():
                return subprocess.run(
                    ['osascript', '-e', 'POSIX path of (choose file with prompt "Select PyTorch Model:")'],
                    capture_output=True, text=True
                )
            result = await anyio.to_thread.run_sync(run_osascript)
            file_path = result.stdout.strip()
            return {"status": "success", "path": file_path}
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

@app.post("/api/model/analyze")
async def analyze_model_endpoint(req: AnalyzeRequest):
    if not os.path.exists(req.model_path):
        raise HTTPException(status_code=404, detail="Model path not found")
    try:
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        analysis = await anyio.to_thread.run_sync(ma.analyze_model, model_obj)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
        # Strategy calculation is pure logic, but we run in thread for consistency
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
        # Autotune now internally uses a ThreadPool for candidates, 
        # but we wrap the whole call in run_sync to keep the FastAPI event loop free.
        best_config, _, best_result = await anyio.to_thread.run_sync(at.autotune, model_obj, req.system_profile, req.goal)
        return {
            "status": "success", 
            "best_config": best_config,
            "best_result": best_result
        }
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
