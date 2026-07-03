import anyio
from sysaware.infrastructure import store as store
from sysaware.infrastructure.broker import broker

async def ingest_telemetry(machine_id: str, hardware_profile: dict, goal: str, latency_range: list[float], memory_mb: float, model_hash: str, decode_tokens_per_sec: float | None, prefill_latency_ms: float | None, raw_report: dict) -> dict:
    """Save client telemetry report to DB and publish event."""
    await anyio.to_thread.run_sync(
        store.insert_telemetry,
        machine_id,
        hardware_profile,
        goal,
        latency_range,
        memory_mb,
        model_hash,
        decode_tokens_per_sec,
        prefill_latency_ms
    )
    await broker.publish({
        "type": "telemetry",
        "data": raw_report
    })
    return {"status": "success"}

async def get_telemetry_history(limit: int, offset: int) -> dict:
    """Retrieve telemetry records from history."""
    history = await anyio.to_thread.run_sync(store.get_recent_telemetry, limit, offset)
    return {"status": "success", "history": history}

async def clear_telemetry(range_type: str) -> dict:
    """Delete history telemetry data."""
    await anyio.to_thread.run_sync(store.clear_telemetry_history, range_type)
    return {"status": "success"}

async def get_active_nodes() -> dict:
    """Retrieve active nodes in the optimization fleet."""
    nodes = await anyio.to_thread.run_sync(store.get_active_nodes)
    return {"status": "success", "nodes": nodes}

async def delete_node(machine_id: str) -> dict:
    """Remove a node from the fleet registry."""
    await anyio.to_thread.run_sync(store.delete_node, machine_id)
    return {"status": "success"}

async def request_join(machine_id: str) -> dict:
    """Submit join request for a fleet node."""
    await anyio.to_thread.run_sync(store.create_join_request, machine_id)
    await broker.publish({
        "type": "join_request",
        "machine_id": machine_id
    })
    return {"status": "pending"}

async def get_join_status(machine_id: str) -> dict:
    """Retrieve node registration status."""
    status = await anyio.to_thread.run_sync(store.get_node_join_status, machine_id)
    return {"status": status}

async def approve_node_join(machine_id: str) -> dict:
    """Approve join request."""
    await anyio.to_thread.run_sync(store.set_node_approval, machine_id, True)
    return {"status": "success"}

async def reject_node_join(machine_id: str) -> dict:
    """Reject join request."""
    await anyio.to_thread.run_sync(store.set_node_approval, machine_id, False)
    return {"status": "success"}

async def update_heartbeat(machine_id: str, hardware_profile: dict | None, status: str) -> dict:
    """Record heartbeat ping from fleet node."""
    await anyio.to_thread.run_sync(store.update_heartbeat, machine_id, hardware_profile, status)
    return {"status": "success"}

async def get_blacklist() -> dict:
    """Retrieve telemetry/node blacklist."""
    entries = await anyio.to_thread.run_sync(store.get_blacklist)
    return {"status": "success", "blacklist": entries}

async def add_to_blacklist(machine_id: str, backend: str, reason: str, raw_entry: dict) -> dict:
    """Add machine to local/fleet blacklist."""
    await anyio.to_thread.run_sync(store.add_to_blacklist, machine_id, backend, reason)
    await broker.publish({
        "type": "blacklist",
        "data": raw_entry
    })
    return {"status": "success"}
