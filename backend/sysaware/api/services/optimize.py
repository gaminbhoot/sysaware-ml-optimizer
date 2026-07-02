import anyio
from ...core import estimator as est
from ...core import strategy_engine as se
from ...core import autotuner as at
from ...cli import load_model_from_path
from ..helpers import run_generator_in_process

async def estimate_baseline(model_path: str, system_profile: dict) -> dict:
    """Load model and estimate baseline performance specs."""
    model_obj = await anyio.to_thread.run_sync(load_model_from_path, model_path, False)
    baseline = await anyio.to_thread.run_sync(est.estimate_performance, model_obj, system_profile)
    return {"status": "success", "baseline": baseline}

async def generate_strategy(system_profile: dict, goal: str, model_analysis: dict | None) -> dict:
    """Generate optimization strategy guidelines."""
    strategy = await anyio.to_thread.run_sync(se.get_strategy, system_profile, goal, model_analysis)
    return {"status": "success", "strategy": strategy}

async def autotune_endpoint(model_path: str, unsafe_load: bool, system_profile: dict, goal: str) -> dict:
    """Run sequential config tuning sweep and return the best config found."""
    model_obj = await anyio.to_thread.run_sync(load_model_from_path, model_path, unsafe_load)
    best_config, _, best_result = await anyio.to_thread.run_sync(at.autotune, model_obj, system_profile, goal)
    return {
        "status": "success", 
        "best_config": best_config,
        "best_result": best_result
    }

async def autotune_stream(model_path: str, unsafe_load: bool, system_profile: dict, goal: str, timeout: int):
    """Yield updates from background autotune process."""
    args = (model_path, unsafe_load, system_profile, goal)
    async for update in run_generator_in_process(timeout, "autotune_worker", args):
        yield update

async def diagnose_stream(model_path: str, unsafe_load: bool, timeout: int):
    """Yield updates from custom diagnostics process."""
    args = (model_path, unsafe_load)
    async for update in run_generator_in_process(timeout, "diagnose_worker", args):
        yield update

async def tune_runtime_stream(model_id: str, source: str, system_profile: dict, timeout: int):
    """Yield updates from runtime-specific optimization process."""
    args = (model_id, source, system_profile)
    async for update in run_generator_in_process(timeout, "tune_runtime_worker", args):
        yield update

async def estimate_inference(hardware_specs: dict, model_metadata: dict) -> dict:
    """Predict inference speed based on hardware specifications and model configuration."""
    result = await anyio.to_thread.run_sync(est.predict_inference_speed, hardware_specs, model_metadata)
    result["status"] = "success"
    return result
