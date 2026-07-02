import anyio
from fastapi import APIRouter
from ...core import system_profiler as sp
from ..helpers import handle_api_exception

router = APIRouter(prefix="/api")

@router.get("/system")
async def system():
    try:
        profile = await anyio.to_thread.run_sync(sp.get_system_profile)
        return profile
    except Exception as e:
        handle_api_exception(e)
