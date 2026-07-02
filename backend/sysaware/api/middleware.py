import time
import json
import collections
import asyncio
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from .config import (
    IS_TEST,
    ENV,
)

# --- Rate Limiting & Concurrency Infrastructure ---
class SimpleRateLimiter:
    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests = collections.defaultdict(list)  # client_ip -> list of timestamps
        
    def is_allowed(self, client_ip: str) -> bool:
        now = time.time()
        self.requests[client_ip] = [t for t in self.requests[client_ip] if now - t < 60]
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return False
        self.requests[client_ip].append(now)
        return True

expensive_limiter = SimpleRateLimiter(requests_per_minute=20)
telemetry_limiter = SimpleRateLimiter(requests_per_minute=60)
general_limiter = SimpleRateLimiter(requests_per_minute=120)

class ConcurrencyTracker:
    def __init__(self, max_concurrent: int = 5):
        self.max_concurrent = max_concurrent
        self.active_count = 0
        self.lock = asyncio.Lock()
        
    async def acquire(self) -> bool:
        async with self.lock:
            if self.active_count >= self.max_concurrent:
                return False
            self.active_count += 1
            return True
            
    async def release(self):
        async with self.lock:
            self.active_count = max(0, self.active_count - 1)

model_concurrency = ConcurrencyTracker(max_concurrent=3)
chat_concurrency = ConcurrencyTracker(max_concurrent=5)

# --- Payload Size, Rate Limit, and Auth Middlewares ---
MAX_PAYLOAD_SIZES = {
    "/api/model/registry": 50 * 1024 * 1024,  # 50 MB
}
DEFAULT_MAX_PAYLOAD_SIZE = 2 * 1024 * 1024  # 2 MB

class ContentTooLargeError(BaseException):
    pass

class LimitUploadSizeMiddleware:
    def __init__(self, app, max_payload_sizes: dict = None, default_max_size: int = DEFAULT_MAX_PAYLOAD_SIZE):
        self.app = app
        self.max_payload_sizes = max_payload_sizes or MAX_PAYLOAD_SIZES
        self.default_max_size = default_max_size

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        method = scope.get("method")
        path = scope.get("path")

        if method not in ("POST", "PUT", "PATCH"):
            await self.app(scope, receive, send)
            return

        max_size = self.max_payload_sizes.get(path, self.default_max_size)
        total_received = 0

        async def custom_receive():
            nonlocal total_received
            event = await receive()
            if event["type"] == "http.request":
                body = event.get("body", b"")
                total_received += len(body)
                if total_received > max_size:
                    raise ContentTooLargeError("Request payload too large.")
            return event

        try:
            await self.app(scope, custom_receive, send)
        except ContentTooLargeError:
            await send({
                "type": "http.response.start",
                "status": 413,
                "headers": [
                    (b"content-type", b"application/json"),
                ]
            })
            await send({
                "type": "http.response.body",
                "body": json.dumps({"detail": f"Request payload too large. Max allowed is {max_size} bytes."}).encode(),
            })

# Short-lived one-time stream tokens for EventSource telemetry stream
_STREAM_TOKENS = {}

EXPENSIVE_ROUTES = [
    "/api/chat/stream",
    "/api/diagnose/custom/stream",
    "/api/optimize/autotune",
    "/api/optimize/autotune/stream",
    "/api/model/analyze",
    "/api/fleet/join/request"
]

TELEMETRY_ROUTES = [
    "/api/telemetry/ingest",
    "/api/telemetry/heartbeat"
]

ADMIN_ROUTES = [
    "/api/fleet/join/approve",
    "/api/fleet/join/reject",
    "/api/fleet/node",  # delete node
    "/api/telemetry/history",
    "/api/telemetry/blacklist"
]

async def security_middleware(request: Request, call_next):
    import sysaware.server as server
    path = request.url.path
    client_ip = request.client.host if request.client else "unknown"
    
    # 1. Payload Size Check (for Content-Length header, as a fast-reject path)
    if request.method in ["POST", "PUT", "PATCH"]:
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                length = int(content_length)
                max_payload_sizes = getattr(server, "MAX_PAYLOAD_SIZES", MAX_PAYLOAD_SIZES)
                default_max_payload_size = getattr(server, "DEFAULT_MAX_PAYLOAD_SIZE", DEFAULT_MAX_PAYLOAD_SIZE)
                max_size = max_payload_sizes.get(path, default_max_payload_size)
                if length > max_size:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request payload too large. Max allowed is {max_size} bytes."}
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length header"})

    if path.startswith("/api"):
        # 2. Authentication Check
        provided_key = request.headers.get("X-API-Key")
        if not provided_key:
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                provided_key = auth_header[7:]

        # Query parameters should only be checked for short-lived stream tokens on `/api/telemetry/stream`
        query_key = request.query_params.get("token") or request.query_params.get("api_key")
            
        # Check stream token first if it is /api/telemetry/stream
        is_authenticated = False
        if path == "/api/health":
            is_authenticated = True
        elif path == "/api/telemetry/stream":
            stream_key = provided_key or query_key
            if stream_key:
                now = time.time()
                expired = [t for t, exp in _STREAM_TOKENS.items() if now > exp]
                for t in expired:
                    _STREAM_TOKENS.pop(t, None)
                if stream_key in _STREAM_TOKENS:
                    _STREAM_TOKENS.pop(stream_key, None)
                    is_authenticated = True

        # Determine if we skip API auth in dev loopback mode
        sysaware_bind = getattr(server, "SYSAWARE_BIND", "127.0.0.1")
        is_loopback = sysaware_bind.strip().lower() in ["127.0.0.1", "localhost", "::1"]
        is_dev = getattr(server, "IS_DEV", True)
        dev_no_auth = is_dev and is_loopback

        if not is_authenticated and not dev_no_auth:
            sysaware_api_key = getattr(server, "SYSAWARE_API_KEY", None)
            sysaware_admin_key = getattr(server, "SYSAWARE_ADMIN_KEY", None)
            if sysaware_api_key:
                is_valid = False
                if provided_key:
                    if provided_key == sysaware_api_key:
                        is_valid = True
                    elif sysaware_admin_key and provided_key == sysaware_admin_key:
                        is_valid = True

                if not is_valid:
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Unauthorized: Invalid or missing API key."}
                    )
                
                # If it is an admin route, check admin key
                is_admin_route = any(path.startswith(r) for r in ADMIN_ROUTES)
                if is_admin_route:
                    if not provided_key or not sysaware_admin_key or provided_key != sysaware_admin_key:
                        return JSONResponse(
                            status_code=403,
                            content={"detail": "Forbidden: Admin privileges required."}
                        )

        # 3. Rate Limiting Check
        if any(path.startswith(r) for r in EXPENSIVE_ROUTES):
            if not expensive_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests. Please slow down on expensive routes."}
                )
        elif any(path.startswith(r) for r in TELEMETRY_ROUTES):
            if not telemetry_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Telemetry rate limit exceeded."}
                )
        else:
            if not general_limiter.is_allowed(client_ip):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Rate limit exceeded."}
                )

    return await call_next(request)

class EventBroker:
    def __init__(self, max_queue_size: int = 100, max_concurrent_streams: int = 20):
        self.listeners = set()
        self.max_queue_size = max_queue_size
        self.max_concurrent_streams = max_concurrent_streams

    async def subscribe(self):
        queue = asyncio.Queue(maxsize=self.max_queue_size)
        self.listeners.add(queue)
        try:
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=25.0)
                    if msg is None:
                        break
                    yield msg
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            self.listeners.discard(queue)

    async def publish(self, data: dict):
        msg = f"data: {json.dumps(data)}\n\n"
        for queue in list(self.listeners):
            try:
                queue.put_nowait(msg)
            except asyncio.QueueFull:
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(None)
                except asyncio.QueueFull:
                    self.listeners.discard(queue)

broker = EventBroker()

