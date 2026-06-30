import socket
import json
import threading
import time
from .logging_utils import get_logger

logger = get_logger("sysaware.discovery")

DISCOVERY_PORT = 8001
BEACON_INTERVAL = 3

def start_beacon(api_port: int):
    """Starts a UDP broadcast beacon on the server side."""
    def beacon_loop():
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        
        beacon_data = json.dumps({
            "service": "sysaware",
            "api_port": api_port
        }).encode()
        
        while True:
            try:
                # Broadcast to the local subnet
                sock.sendto(beacon_data, ('<broadcast>', DISCOVERY_PORT))
            except Exception as e:
                logger.debug(f"Beacon error: {e}")
            time.sleep(BEACON_INTERVAL)

    thread = threading.Thread(target=beacon_loop, daemon=True)
    thread.start()
    logger.info(f"Discovery beacon started on UDP {DISCOVERY_PORT}")

def discover_server(timeout: float = 2.0) -> str | None:
    """Listens for a server beacon on the client side, with a local fallback."""
    logger.info("Discovery: Searching for SysAware server on local network...")
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('', DISCOVERY_PORT))
        except Exception as e:
            logger.debug(f"Could not bind to discovery port: {e}")
            # Fallback will handle it
        else:
            sock.settimeout(timeout)
            start_time = time.time()
            while time.time() - start_time < timeout:
                try:
                    data, addr = sock.recvfrom(1024)
                    message = json.loads(data.decode())
                    if message.get("service") == "sysaware":
                        server_ip = addr[0]
                        api_port = message.get("api_port", 8000)
                        discovered = f"http://{server_ip}:{api_port}"
                        logger.info(f"Discovery: Found server at {discovered}")
                        return discovered
                except (socket.timeout, json.JSONDecodeError):
                    continue
                except Exception as e:
                    logger.debug(f"Discovery listen error: {e}")
                    break
    
    # Local Fallback: If we're on the same machine, try localhost
    logger.info("Discovery: No server found via UDP. Checking for local instance...")
    try:
        import os
        import requests
        
        # Build headers if key is available locally
        headers = {}
        api_key = os.getenv("SYSAWARE_API_KEY")
        if api_key:
            headers["X-API-Key"] = api_key

        # Try common local addresses
        for host in ["127.0.0.1", "localhost"]:
            try:
                # First try public /api/health
                res = requests.get(f"http://{host}:8000/api/health", headers=headers, timeout=0.5)
                if res.status_code == 200:
                    fallback = f"http://{host}:8000"
                    logger.info(f"Discovery: Local server detected at {fallback}")
                    return fallback
            except:
                pass

            try:
                # Fallback to /api/system with headers
                res = requests.get(f"http://{host}:8000/api/system", headers=headers, timeout=0.5)
                if res.status_code == 200:
                    fallback = f"http://{host}:8000"
                    logger.info(f"Discovery: Local server detected at {fallback}")
                    return fallback
            except:
                continue
    except:
        pass
                
    logger.info("Discovery: No server detected.")
    return None
