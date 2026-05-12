import requests
import json
import time

import os

def test_autotune_stream():
    port = os.getenv("PORT", "8000")
    url = f"http://localhost:{port}/api/optimize/autotune/stream"
    # Note: server.py needs to be running.
    # We need a dummy model and system profile.
    payload = {
        "model_path": "temp_model.pt",
        "system_profile": {
            "device": "cpu",
            "ram_gb": 16,
            "processor": "Apple M4"
        },
        "goal": "latency",
        "unsafe_load": True
    }
    
    print(f"Connecting to {url}...")
    try:
        # Use stream=True to handle SSE
        response = requests.post(url, json=payload, stream=True)
        response.raise_for_status()
        
        print("Stream started:")
        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    data = json.loads(decoded_line[6:])
                    print(f"Received update: {json.dumps(data, indent=2)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_autotune_stream()
