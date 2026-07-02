from fastapi import APIRouter
from ..services import system as system_svc
from ..helpers import handle_api_exception

router = APIRouter(prefix="/api")

@router.get("/system")
async def system():
    try:
        return await system_svc.get_system_profile()
    except Exception as e:
        handle_api_exception(e)
