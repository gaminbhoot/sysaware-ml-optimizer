import anyio
from sysaware.infrastructure.clients import lmstudio as lms
from sysaware.infrastructure.clients import ollama as ollama
from ..helpers import run_generator_in_process

# --- LM Studio Sync/List/Load/Unload ---
async def sync_lmstudio(host: str, port: int, model_id: str | None) -> dict:
    """Sync and analyze currently loaded LM Studio model."""
    client = lms.LMStudioClient(host=host, port=port)
    analysis = await anyio.to_thread.run_sync(client.sync_loaded_model, model_id)
    return {"status": "success", "analysis": analysis}

async def list_lmstudio_models(host: str, port: int) -> dict:
    """Get list of all downloaded LM Studio models."""
    client = lms.LMStudioClient(host=host, port=port)
    models = await anyio.to_thread.run_sync(client.get_all_models)
    return {"status": "success", "models": models}

async def load_lmstudio_model(host: str, port: int, model_id: str) -> bool:
    """Load a model in LM Studio."""
    client = lms.LMStudioClient(host=host, port=port)
    return await anyio.to_thread.run_sync(client.load_model, model_id)

async def unload_lmstudio_model(host: str, port: int, model_id: str | None) -> bool:
    """Unload a model from LM Studio."""
    client = lms.LMStudioClient(host=host, port=port)
    return await anyio.to_thread.run_sync(client.unload_model, model_id)

# --- Ollama Sync/List/Load/Unload ---
async def sync_ollama(host: str, port: int, model_id: str | None) -> dict:
    """Sync and analyze currently loaded Ollama model."""
    client = ollama.OllamaClient(host=host, port=port)
    analysis = await anyio.to_thread.run_sync(client.sync_loaded_model, model_id)
    return {"status": "success", "analysis": analysis}

async def list_ollama_models(host: str, port: int) -> dict:
    """Get list of all downloaded Ollama models."""
    client = ollama.OllamaClient(host=host, port=port)
    models = await anyio.to_thread.run_sync(client.get_all_models)
    return {"status": "success", "models": models}

async def load_ollama_model(host: str, port: int, model_id: str) -> bool:
    """Load a model in Ollama."""
    client = ollama.OllamaClient(host=host, port=port)
    return await anyio.to_thread.run_sync(client.load_model, model_id)

async def unload_ollama_model(host: str, port: int, model_id: str | None) -> bool:
    """Unload a model from Ollama."""
    client = ollama.OllamaClient(host=host, port=port)
    return await anyio.to_thread.run_sync(client.unload_model, model_id)

# --- Chat Stream helper ---
async def chat_stream(host: str, port: int, messages: list, model_id: str | None, timeout: int):
    """Yield updates from proxied chat stream process."""
    args = (port, host, messages, model_id)
    async for update in run_generator_in_process(timeout, "chat_worker", args):
        yield update
