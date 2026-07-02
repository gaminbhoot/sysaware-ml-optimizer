import anyio
from ...core import system_profiler as sp

async def get_system_profile() -> dict:
    """Retrieve system profile including hardware and OS info."""
    profile = await anyio.to_thread.run_sync(sp.get_system_profile)
    return {"status": "success", "profile": profile}
