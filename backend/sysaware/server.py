import uvicorn
import os
import sys
from pathlib import Path

# Ensure the backend directory is in sys.path and package context is set for direct execution
if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    __package__ = "sysaware"
else:
    sys.path.insert(0, str(Path(__file__).resolve().parent))

# Import config values to set them as module attributes
from .api import config
from .api import middleware
from .api.app import app

# Re-expose config as module variables for backwards compatibility / monkeypatching
ENV = config.ENV
IS_PRODUCTION = config.IS_PRODUCTION
IS_DEV = config.IS_DEV
IS_TEST = config.IS_TEST
SYSAWARE_BIND = config.SYSAWARE_BIND
SYSAWARE_API_KEY = config.SYSAWARE_API_KEY
SYSAWARE_ADMIN_KEY = config.SYSAWARE_ADMIN_KEY

AUTOTUNE_STREAM_TIMEOUT = config.AUTOTUNE_STREAM_TIMEOUT
DIAGNOSTIC_STREAM_TIMEOUT = config.DIAGNOSTIC_STREAM_TIMEOUT
RUNNER_TUNE_STREAM_TIMEOUT = config.RUNNER_TUNE_STREAM_TIMEOUT
CHAT_STREAM_TIMEOUT = config.CHAT_STREAM_TIMEOUT

MAX_PAYLOAD_SIZES = config.MAX_PAYLOAD_SIZES
DEFAULT_MAX_PAYLOAD_SIZE = config.DEFAULT_MAX_PAYLOAD_SIZE

broker = middleware.broker

if __name__ == "__main__":
    import socket
    try:
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
    except:
        local_ip = "0.0.0.0"
    
    print(f"\n" + "="*50)
    print(f"SYSAWARE ML OPTIMIZER SERVER ACTIVE")
    print(f"Local Access:   http://localhost:8000")
    print(f"Network Access: http://{local_ip}:8000")
    print(f"UDP Discovery:  Port 8001")
    print("="*50)
    print("TIP: For LM Studio sync, ensure 'Local Server' is ON.")
    print("TIP: If telemetry fails, check firewall for Port 8000 (TCP) and 8001 (UDP).")
    print("="*50 + "\n")
    uvicorn.run(app, host=SYSAWARE_BIND, port=8000, log_level="info")
