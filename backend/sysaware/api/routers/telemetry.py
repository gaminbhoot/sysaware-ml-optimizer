import time
import secrets
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse

from ..schemas import (
    TelemetryReport,
    HeartbeatRequest,
    BlacklistEntry,
    JoinRequest,
)
from ..helpers import handle_api_exception
from ..middleware import broker, _STREAM_TOKENS
from ..services import telemetry as telemetry_svc

router = APIRouter(prefix="/api")

@router.post("/telemetry/ingest")
async def ingest_telemetry(report: TelemetryReport):
    try:
        return await telemetry_svc.ingest_telemetry(
            report.machine_id,
            report.hardware_profile,
            report.goal,
            report.latency_range,
            report.memory_mb,
            report.model_hash,
            report.decode_tokens_per_sec,
            report.prefill_latency_ms,
            report.model_dump()
        )
    except Exception as e:
        handle_api_exception(e)

@router.post("/auth/stream-token")
async def generate_stream_token():
    now = time.time()
    expired = [t for t, exp in _STREAM_TOKENS.items() if now > exp]
    for t in expired:
        _STREAM_TOKENS.pop(t, None)
        
    if len(_STREAM_TOKENS) >= 1000:
        raise HTTPException(status_code=429, detail="Too many pending stream tokens.")
        
    token = "stream_" + secrets.token_hex(16)
    _STREAM_TOKENS[token] = now + 30.0
    return {"token": token}

@router.get("/telemetry/stream")
async def stream_telemetry():
    if len(broker.listeners) >= broker.max_concurrent_streams:
        raise HTTPException(status_code=429, detail="Too many concurrent telemetry streams.")
    return StreamingResponse(broker.subscribe(), media_type="text/event-stream")

@router.get("/telemetry/history")
async def get_telemetry_history(limit: int = 50, offset: int = 0):
    try:
        return await telemetry_svc.get_telemetry_history(limit, offset)
    except Exception as e:
        handle_api_exception(e)

@router.delete("/telemetry/history")
async def clear_telemetry(range_type: str = "all"):
    try:
        return await telemetry_svc.clear_telemetry(range_type)
    except Exception as e:
        handle_api_exception(e)

@router.get("/fleet/active")
async def get_active_nodes():
    try:
        return await telemetry_svc.get_active_nodes()
    except Exception as e:
        handle_api_exception(e)

@router.delete("/fleet/node/{machine_id}")
async def delete_node(machine_id: str):
    try:
        return await telemetry_svc.delete_node(machine_id)
    except Exception as e:
        handle_api_exception(e)

@router.post("/fleet/join/request")
async def request_join(req: JoinRequest):
    try:
        return await telemetry_svc.request_join(req.machine_id)
    except Exception as e:
        handle_api_exception(e)

@router.get("/fleet/join/status")
async def get_join_status(machine_id: str):
    try:
        return await telemetry_svc.get_join_status(machine_id)
    except Exception as e:
        handle_api_exception(e)

@router.post("/fleet/join/approve")
async def approve_join(req: JoinRequest, request: Request):
    try:
        caller_machine_id = request.headers.get("X-Machine-ID")
        if caller_machine_id and caller_machine_id == req.machine_id:
            raise HTTPException(status_code=400, detail="Nodes cannot approve their own join requests.")
        return await telemetry_svc.approve_node_join(req.machine_id)
    except Exception as e:
        handle_api_exception(e)

@router.post("/fleet/join/reject")
async def reject_join(req: JoinRequest, request: Request):
    try:
        caller_machine_id = request.headers.get("X-Machine-ID")
        if caller_machine_id and caller_machine_id == req.machine_id:
            raise HTTPException(status_code=400, detail="Nodes cannot reject their own join requests.")
        return await telemetry_svc.reject_node_join(req.machine_id)
    except Exception as e:
        handle_api_exception(e)

@router.post("/telemetry/heartbeat")
async def heartbeat(req: HeartbeatRequest):
    try:
        return await telemetry_svc.update_heartbeat(req.machine_id, req.hardware_profile, req.status)
    except Exception as e:
        handle_api_exception(e)

@router.get("/telemetry/blacklist")
async def get_blacklist():
    try:
        return await telemetry_svc.get_blacklist()
    except Exception as e:
        handle_api_exception(e)

@router.post("/telemetry/blacklist")
async def add_to_blacklist(entry: BlacklistEntry):
    try:
        return await telemetry_svc.add_to_blacklist(
            entry.machine_id,
            entry.backend,
            entry.reason,
            entry.model_dump()
        )
    except Exception as e:
        handle_api_exception(e)
