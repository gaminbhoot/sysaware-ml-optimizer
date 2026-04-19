import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import os
import core.system_profiler as sp
import core.model_analyzer as ma
import core.estimator as est
import core.strategy_engine as se
import core.prompt_optimizer as po

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

# --- API Routes ---
@app.get("/api/system")
def get_system():
    try:
        profile = sp.get_system_profile()
        return {"status": "success", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/model/analyze")
def analyze_model_endpoint(req: AnalyzeRequest):
    if not os.path.exists(req.model_path):
        raise HTTPException(status_code=404, detail="Model path not found")
    try:
        model_obj = ma.load_model_from_path(req.model_path, unsafe_load=req.unsafe_load)
        analysis = ma.analyze_model(model_obj)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/baseline")
def estimate_baseline(req: BaselineRequest):
    try:
        model_obj = ma.load_model_from_path(req.model_path, unsafe_load=False)
        baseline = est.estimate_performance(model_obj, req.system_profile)
        return {"status": "success", "baseline": baseline}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/optimize/strategy")
def generate_strategy(req: StrategyRequest):
    try:
        strategy = se.get_strategy(req.system_profile, req.goal, req.model_analysis)
        return {"status": "success", "strategy": strategy}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/prompt/optimize")
def optimize_prompt(req: PromptRequest):
    try:
        result = po.optimize_prompt(req.prompt, req.intent)
        return {"status": "success", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Serve React Frontend ---
# Make sure to run `npm run build` inside `frontend/` so that the dist folder exists!
if os.path.exists("frontend/dist"):
    app.mount("/", StaticFiles(directory="frontend/dist", html=True), name="frontend")
else:
    @app.get("/")
    def index():
        return {
            "message": "API is running. However, the React frontend is not built yet.",
            "instructions": "Navigate to /frontend and run 'npm install' then 'npm run build'."
        }

if __name__ == "__main__":
    # Start the FastAPI server using Uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
