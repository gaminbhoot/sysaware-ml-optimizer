import asyncio
import json

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
                # Slow client: discard oldest item to ensure we can enqueue the None disconnect sentinel
                try:
                    queue.get_nowait()
                except asyncio.QueueEmpty:
                    pass
                try:
                    queue.put_nowait(None)
                except asyncio.QueueFull:
                    self.listeners.discard(queue)

broker = EventBroker()
