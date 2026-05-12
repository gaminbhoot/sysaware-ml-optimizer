import socket
import json
import threading
import time
from core.logging_utils import get_logger

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
    """Listens for a server beacon on the client side."""
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind(('', DISCOVERY_PORT))
        except Exception as e:
            logger.debug(f"Could not bind to discovery port: {e}")
            return None
            
        sock.settimeout(timeout)
        
        start_time = time.time()
        while time.time() - start_time < timeout:
            try:
                data, addr = sock.recvfrom(1024)
                message = json.loads(data.decode())
                if message.get("service") == "sysaware":
                    server_ip = addr[0]
                    api_port = message.get("api_port", 8000)
                    return f"http://{server_ip}:{api_port}"
            except (socket.timeout, json.JSONDecodeError):
                continue
            except Exception as e:
                logger.debug(f"Discovery listen error: {e}")
                break
                
        return None
