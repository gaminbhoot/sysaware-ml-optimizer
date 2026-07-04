import os
import sys
import asyncio
import anyio
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from .config import (
    CORS_ORIGINS,
    MAX_PAYLOAD_SIZES,
    DEFAULT_MAX_PAYLOAD_SIZE,
)
from .middleware import (
    LimitUploadSizeMiddleware,
    security_middleware,
)
from .routers import (
    health,
    system,
    models,
    optimize,
    runtimes,
    telemetry,
    prompt,
)
from sysaware.infrastructure import store
from sysaware.infrastructure import discovery as discovery
from sysaware.infrastructure.logging_utils import get_logger
from sysaware.infrastructure import system_profiler as sp

logger = get_logger("sysaware.api.app")

# --- Background Tasks ---
async def server_heartbeat_task():
    """Periodically sends a heartbeat for the machine running the server."""
    machine_id = f"{os.uname().nodename}_{os.uname().sysname}" if hasattr(os, "uname") else f"{os.environ.get('COMPUTERNAME', 'server')}_windows"
    machine_id += "_local_server"
    
    # Simple profile for the server node
    profile = sp.get_system_profile()
    
    while True:
        try:
            # We call the store directly since we're in the same process
            await anyio.to_thread.run_sync(store.update_heartbeat, machine_id, profile, "idle")
        except Exception as e:
            logger.error(f"Error in server heartbeat: {e}")
        await asyncio.sleep(30)

# --- Lifecycle ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles startup and shutdown events."""
    # Initialize DB
    await anyio.to_thread.run_sync(store.init_db)
    # Start background tasks
    asyncio.create_task(server_heartbeat_task())
    # Start UDP Discovery Beacon on port 8000
    discovery.start_beacon(api_port=8000)
    yield

app = FastAPI(title="SysAware ML Optimizer API", lifespan=lifespan)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Payload Size Limit Middleware
app.add_middleware(
    LimitUploadSizeMiddleware,
    max_payload_sizes=MAX_PAYLOAD_SIZES,
    default_max_size=DEFAULT_MAX_PAYLOAD_SIZE,
)

# Custom Security Middleware (Rate limits, auth)
app.middleware("http")(security_middleware)

# Register Routers
app.include_router(health.router)
app.include_router(system.router)
app.include_router(models.router)
app.include_router(optimize.router)
app.include_router(runtimes.router)
app.include_router(telemetry.router)
app.include_router(prompt.router)

# --- Serve React Frontend ---
# Search in root level frontend/dist
frontend_dir = Path(__file__).resolve().parent.parent.parent.parent / "frontend" / "dist"
if frontend_dir.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dir), html=True), name="frontend")
else:
    @app.get("/")
    async def index():
        return {
            "message": "API is running. However, the React frontend is not built yet.",
            "instructions": "Navigate to /frontend and run 'npm install' then 'npm run build'."
        }
