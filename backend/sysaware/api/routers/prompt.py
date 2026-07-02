from fastapi import APIRouter
from ..schemas import PromptRequest
from ..helpers import handle_api_exception
from ..services import prompt as prompt_svc

router = APIRouter(prefix="/api")

@router.post("/prompt/optimize")
async def optimize_prompt(req: PromptRequest):
    try:
        return await prompt_svc.optimize_prompt(req.prompt, req.intent)
    except Exception as e:
        handle_api_exception(e)
