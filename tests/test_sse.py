import requests
import json
import time
import os
import torch
import torch.nn as nn
from pathlib import Path
import pytest

class DummyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(10, 10)

@pytest.fixture(autouse=True)
def setup_dummy_model():
    orig_dir = Path.cwd()
    artifacts_dir = orig_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    model_path = artifacts_dir / "temp_model.pt"
    
    if not model_path.exists():
        torch.save(DummyModel(), model_path)
    
    yield

def test_autotune_stream():
    port = os.getenv("PORT", "8000")
    url = f"http://localhost:{port}/api/optimize/autotune/stream"
    # Note: server.py needs to be running.
    # We need a dummy model and system profile.
    payload = {
        "model_path": "artifacts/temp_model.pt",
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
