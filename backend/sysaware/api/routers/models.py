import os
from fastapi import APIRouter, HTTPException

from ..schemas import (
    AnalyzeRequest,
    UnloadRequest,
    ModelRegisterRequest,
    DriftRequest,
)
from ..helpers import (
    is_path_allowed,
    validate_model_path_and_load,
    validate_host_and_port,
    handle_api_exception,
)
from ..middleware import model_concurrency
from ..services import models as models_svc

from sysaware.core.logging_utils import get_logger

logger = get_logger("sysaware.api.routers.models")

router = APIRouter(prefix="/api")

@router.get("/model/browse")
async def browse_model():
    try:
        res = await models_svc.browse_model_file(is_path_allowed)
        if res.get("status") == "error":
            raise HTTPException(status_code=400, detail=res["detail"])
        return res
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        handle_api_exception(e)

@router.post("/model/analyze")
async def analyze_model(req: AnalyzeRequest):
    import sysaware.server as server
    is_production = getattr(server, "IS_PRODUCTION", False)
    
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    if not os.path.exists(req.model_path):
        if is_production:
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            raise HTTPException(status_code=404, detail="Model path not found")
        
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    try:
        return await models_svc.analyze_model(req.model_path, req.unsafe_load)
    except Exception as e:
        if is_production:
            logger.error(f"Model analysis failed: {e}")
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            handle_api_exception(e)
    finally:
        await model_concurrency.release()

@router.post("/model/unload")
async def unload_model(req: UnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        return await models_svc.unload_model(req.model_id, req.host, req.port)
    except Exception as e:
        logger.error(f"Model Unload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model unload failed: {str(e)}")

@router.post("/model/registry", deprecated=True)
async def register_model(req: ModelRegisterRequest):
    try:
        return await models_svc.register_model(
            req.model_hash,
            req.model_name,
            req.reference_latency,
            req.reference_memory_mb,
            req.reference_throughput,
            req.metadata
        )
    except Exception as e:
        handle_api_exception(e)

@router.post("/model/drift", deprecated=True)
async def check_drift(req: DriftRequest):
    try:
        return await models_svc.check_drift(
            req.model_hash,
            req.current_latency,
            req.current_throughput
        )
    except Exception as e:
        handle_api_exception(e)

@router.get("/models/recommendations")
async def get_recommendations():
    try:
        return await models_svc.get_recommendations()
    except Exception as e:
        handle_api_exception(e)
