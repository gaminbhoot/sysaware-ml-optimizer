import anyio
from ...core import prompt_optimizer as po

async def optimize_prompt(prompt: str, intent: str) -> dict:
    """Analyze and optimize prompt structure based on intent."""
    result = await anyio.to_thread.run_sync(po.optimize_prompt, prompt, intent)
    return {"status": "success", "result": result}
