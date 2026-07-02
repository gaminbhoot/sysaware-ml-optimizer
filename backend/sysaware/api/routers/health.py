from fastapi import APIRouter
from ..services import health as health_svc

router = APIRouter(prefix="/api")

@router.get("/health")
async def health():
    return health_svc.check_health()
