import anyio
from fastapi import APIRouter
from ...core import prompt_optimizer as po
from ..schemas import PromptRequest
from ..helpers import handle_api_exception

router = APIRouter(prefix="/api")

@router.post("/prompt/optimize")
async def optimize_prompt(req: PromptRequest):
    try:
        result = await anyio.to_thread.run_sync(po.optimize_prompt, req.prompt, req.intent)
        return {"status": "success", "result": result}
    except Exception as e:
        handle_api_exception(e)
