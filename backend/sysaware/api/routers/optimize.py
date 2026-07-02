import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

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
)
from ..middleware import model_concurrency
from ..services import optimize as optimize_svc
from ..config import (
    AUTOTUNE_STREAM_TIMEOUT,
    DIAGNOSTIC_STREAM_TIMEOUT,
    RUNNER_TUNE_STREAM_TIMEOUT,
)

router = APIRouter(prefix="/api")

@router.post("/optimize/baseline")
async def estimate_baseline(req: BaselineRequest):
    validate_model_path_and_load(req.model_path, False)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    try:
        return await optimize_svc.estimate_baseline(req.model_path, req.system_profile)
    except Exception as e:
        handle_api_exception(e)
    finally:
        await model_concurrency.release()

@router.post("/optimize/strategy")
async def generate_strategy(req: StrategyRequest):
    try:
        return await optimize_svc.generate_strategy(req.system_profile, req.goal, req.model_analysis)
    except Exception as e:
        handle_api_exception(e)

@router.post("/optimize/autotune")
async def autotune_endpoint(req: AutotuneRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    try:
        return await optimize_svc.autotune_endpoint(req.model_path, req.unsafe_load, req.system_profile, req.goal)
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
        is_production = getattr(server, "IS_PRODUCTION", False)
        timeout = getattr(server, "AUTOTUNE_STREAM_TIMEOUT", AUTOTUNE_STREAM_TIMEOUT)
        try:
            async for update in optimize_svc.autotune_stream(req.model_path, req.unsafe_load, req.system_profile, req.goal, timeout):
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
        is_production = getattr(server, "IS_PRODUCTION", False)
        timeout = getattr(server, "DIAGNOSTIC_STREAM_TIMEOUT", DIAGNOSTIC_STREAM_TIMEOUT)
        try:
            async for update in optimize_svc.diagnose_stream(req.model_path, req.unsafe_load, timeout):
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
            is_production = getattr(server, "IS_PRODUCTION", False)
            timeout = getattr(server, "RUNNER_TUNE_STREAM_TIMEOUT", RUNNER_TUNE_STREAM_TIMEOUT)
            async for update in optimize_svc.tune_runtime_stream(req.model_id, req.source, req.system_profile, timeout):
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
        return await optimize_svc.estimate_inference(req.hardware_specs, req.model_metadata)
    except Exception as e:
        handle_api_exception(e)
