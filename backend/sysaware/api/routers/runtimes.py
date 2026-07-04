import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from ..schemas import (
    LMStudioSyncRequest,
    ModelLoadRequest,
    UnloadRequest,
    OllamaSyncRequest,
    OllamaLoadRequest,
    OllamaUnloadRequest,
    ChatRequest,
)
from ..helpers import (
    validate_host_and_port,
    handle_api_exception,
)
from ..middleware import chat_concurrency
from ..services import runtimes as runtimes_svc
from ..config import CHAT_STREAM_TIMEOUT

from sysaware.core.logging_utils import get_logger

logger = get_logger("sysaware.api.routers.runtimes")

router = APIRouter(prefix="/api")

def msg_content_filter(content: str) -> str:
    """Optional: strip frontend-only markers if any."""
    return content.strip()

# --- LM Studio Endpoints ---
@router.post("/lmstudio/sync")
async def sync_lmstudio(req: LMStudioSyncRequest):
    logger.info(f"LM Studio Sync attempt target: {req.host}:{req.port}")
    try:
        validate_host_and_port(req.host, req.port)
        res = await runtimes_svc.sync_lmstudio(req.host, req.port, req.model_id)
        if not res.get("analysis"):
            logger.warning("LM Studio Sync Result: FAIL - No active model detected.")
            raise HTTPException(status_code=404, detail=f"No loaded model found in LM Studio at {req.host}:{req.port}. Check if 'Local Server' is ON and a model is loaded.")
        logger.info(f"LM Studio Sync Result: SUCCESS - Active model: {res['analysis']['model_name']}")
        return res
    except Exception as e:
        if isinstance(e, HTTPException): 
            logger.warning(f"LM Studio Sync Result: HTTP ERROR - {e.detail}")
            raise e
        logger.error(f"LM Studio Sync Result: UNEXPECTED ERROR - {str(e)}")
        handle_api_exception(e)

@router.get("/lmstudio/models")
async def list_lmstudio_models(host: str = "127.0.0.1", port: int = 1234):
    try:
        validate_host_and_port(host, port)
        return await runtimes_svc.list_lmstudio_models(host, port)
    except Exception as e:
        handle_api_exception(e)

@router.post("/lmstudio/load")
async def load_lmstudio_model(req: ModelLoadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        success = await runtimes_svc.load_lmstudio_model(req.host, req.port, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=505, detail="Failed to load model in LM Studio")
    except Exception as e:
        handle_api_exception(e)

@router.post("/lmstudio/unload")
async def unload_lmstudio_model(req: UnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        success = await runtimes_svc.unload_lmstudio_model(req.host, req.port, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=505, detail="Failed to unload model in LM Studio")
    except Exception as e:
        handle_api_exception(e)

# --- Ollama Endpoints ---
@router.post("/ollama/sync")
async def sync_ollama(req: OllamaSyncRequest):
    logger.info(f"Ollama Sync attempt target: {req.host}:{req.port}")
    try:
        validate_host_and_port(req.host, req.port)
        res = await runtimes_svc.sync_ollama(req.host, req.port, req.model_id)
        if not res.get("analysis"):
            logger.warning("Ollama Sync Result: FAIL - No loaded model detected.")
            raise HTTPException(status_code=404, detail=f"No loaded model found in Ollama at {req.host}:{req.port}. Check if Ollama is running and a model is loaded.")
        logger.info(f"Ollama Sync Result: SUCCESS - Active model: {res['analysis']['model_name']}")
        return res
    except Exception as e:
        if isinstance(e, HTTPException):
            logger.warning(f"Ollama Sync Result: HTTP ERROR - {e.detail}")
            raise e
        logger.error(f"Ollama Sync Result: UNEXPECTED ERROR - {str(e)}")
        handle_api_exception(e)

@router.get("/ollama/models")
async def list_ollama_models(host: str = "127.0.0.1", port: int = 11434):
    try:
        validate_host_and_port(host, port)
        return await runtimes_svc.list_ollama_models(host, port)
    except Exception as e:
        handle_api_exception(e)

@router.post("/ollama/load")
async def load_ollama_model(req: OllamaLoadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        success = await runtimes_svc.load_ollama_model(req.host, req.port, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=505, detail="Failed to load model in Ollama")
    except Exception as e:
        handle_api_exception(e)

@router.post("/ollama/unload")
async def unload_ollama_model(req: OllamaUnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        success = await runtimes_svc.unload_ollama_model(req.host, req.port, req.model_id)
        if success:
            return {"status": "success"}
        else:
            raise HTTPException(status_code=505, detail="Failed to unload model in Ollama")
    except Exception as e:
        handle_api_exception(e)

# --- Proxied Chat Stream Endpoint ---
@router.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    validate_host_and_port(req.host, req.port)
    if not await chat_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent chat streams reached.")
    
    try:
        messages = [{"role": m.role, "content": msg_content_filter(m.content)} for m in req.messages]
        
        async def event_generator():
            import sysaware.server as server
            is_production = getattr(server, "IS_PRODUCTION", False)
            timeout = getattr(server, "CHAT_STREAM_TIMEOUT", CHAT_STREAM_TIMEOUT)
            try:
                has_error = False
                async for update in runtimes_svc.chat_stream(req.host, req.port, messages, req.model_id, timeout):
                    if isinstance(update, dict) and "error" in update:
                        has_error = True
                        detail = update["error"]
                        if is_production and "timed out" not in detail:
                            detail = "An error occurred during chat processing"
                        yield f"data: {json.dumps({'error': detail})}\n\n"
                    elif isinstance(update, dict) and "detail" in update and update.get("status") == "error":
                        has_error = True
                        detail = update["detail"]
                        if is_production and "timed out" not in detail:
                            detail = "An error occurred during chat processing"
                        yield f"data: {json.dumps({'error': detail})}\n\n"
                    else:
                        yield f"data: {json.dumps(update)}\n\n"
                
                if not has_error:
                    yield f"data: {json.dumps({'status': 'done'})}\n\n"
            finally:
                await chat_concurrency.release()

        return StreamingResponse(event_generator(), media_type="text/event-stream")
    except Exception as e:
        await chat_concurrency.release()
        handle_api_exception(e)
