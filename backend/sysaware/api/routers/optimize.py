import json
import anyio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ...core import estimator as est
from ...core import strategy_engine as se
from ...core import autotuner as at
from ...cli import load_model_from_path

from ..schemas import (
    BaselineRequest,
    StrategyRequest,
    AutotuneRequest,
    DiagnosticRequest,
    RuntimeTuneRequest,
    InferenceEstimateRequest,
)
from ..helpers import (
    validate_model_path_and_load,
    handle_api_exception,
    run_generator_in_process,
)
from ..middleware import model_concurrency
from ..config import (
    AUTOTUNE_STREAM_TIMEOUT,
    DIAGNOSTIC_STREAM_TIMEOUT,
    RUNNER_TUNE_STREAM_TIMEOUT,
    IS_PRODUCTION,
)

router = APIRouter(prefix="/api")

@router.post("/optimize/baseline")
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

@router.post("/optimize/strategy")
async def generate_strategy(req: StrategyRequest):
    try:
        strategy = await anyio.to_thread.run_sync(se.get_strategy, req.system_profile, req.goal, req.model_analysis)
        return {"status": "success", "strategy": strategy}
    except Exception as e:
        handle_api_exception(e)

@router.post("/optimize/autotune")
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

@router.post("/optimize/autotune/stream")
async def autotune_stream_endpoint(req: AutotuneRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    async def event_generator():
        import sysaware.server as server
        is_production = getattr(server, "IS_PRODUCTION", IS_PRODUCTION)
        timeout = getattr(server, "AUTOTUNE_STREAM_TIMEOUT", AUTOTUNE_STREAM_TIMEOUT)
        try:
            args = (req.model_path, req.unsafe_load, req.system_profile, req.goal)
            async for update in run_generator_in_process(timeout, "autotune_worker", args):
                if isinstance(update, dict) and "detail" in update and update.get("status") == "error":
                    detail = update["detail"]
                    if is_production and "timed out" not in detail:
                        detail = "An error occurred during autotuning"
                    yield f"data: {json.dumps({'status': 'error', 'detail': detail})}\n\n"
                else:
                    yield f"data: {json.dumps(update)}\n\n"
        finally:
            await model_concurrency.release()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/diagnose/custom/stream")
async def diagnose_custom_stream(req: DiagnosticRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    async def event_generator():
        import sysaware.server as server
        is_production = getattr(server, "IS_PRODUCTION", IS_PRODUCTION)
        timeout = getattr(server, "DIAGNOSTIC_STREAM_TIMEOUT", DIAGNOSTIC_STREAM_TIMEOUT)
        try:
            args = (req.model_path, req.unsafe_load)
            async for update in run_generator_in_process(timeout, "diagnose_worker", args):
                if isinstance(update, dict) and "detail" in update and update.get("status") == "error":
                    detail = update["detail"]
                    if is_production and "timed out" not in detail:
                        detail = "An error occurred during diagnostics"
                    yield f"data: {json.dumps({'status': 'error', 'detail': detail})}\n\n"
                else:
                    yield f"data: {json.dumps(update)}\n\n"
        finally:
            await model_concurrency.release()
            
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.post("/tune/runtime/stream")
async def tune_runtime_stream(req: RuntimeTuneRequest):
    try:
        async def event_generator():
            import sysaware.server as server
            is_production = getattr(server, "IS_PRODUCTION", IS_PRODUCTION)
            timeout = getattr(server, "RUNNER_TUNE_STREAM_TIMEOUT", RUNNER_TUNE_STREAM_TIMEOUT)
            args = (req.model_id, req.source, req.system_profile)
            async for update in run_generator_in_process(timeout, "tune_runtime_worker", args):
                if isinstance(update, dict) and "detail" in update and update.get("status") == "error":
                    detail = update["detail"]
                    if is_production and "timed out" not in detail:
                        detail = "An error occurred during runtime tuning"
                    yield f"data: {json.dumps({'status': 'error', 'detail': detail})}\n\n"
                else:
                    yield f"data: {json.dumps(update)}\n\n"
        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        handle_api_exception(e)

@router.post("/estimate/inference")
async def estimate_inference(req: InferenceEstimateRequest):
    try:
        result = await anyio.to_thread.run_sync(est.predict_inference_speed, req.hardware_specs, req.model_metadata)
        result["status"] = "success"
        return result
    except Exception as e:
        handle_api_exception(e)
