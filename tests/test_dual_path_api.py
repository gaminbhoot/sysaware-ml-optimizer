import pytest
pytest.importorskip("torch")
from fastapi.testclient import TestClient
from sysaware.server import app
import json
import torch
import torch.nn as nn
from pathlib import Path

client = TestClient(app)

class DummyModel(nn.Module):
    def __init__(self):
        super().__init__()
        self.fc = nn.Linear(10, 10)

@pytest.fixture(autouse=True)
def setup_dummy_model(tmp_path):
    orig_dir = Path.cwd()
    artifacts_dir = orig_dir / "artifacts"
    artifacts_dir.mkdir(exist_ok=True)
    model_path = artifacts_dir / "temp_model.pt"
    
    if not model_path.exists():
        torch.save(DummyModel(), model_path)
    
    yield
    # We could optionally clean up, but keeping it is fine.

def test_diagnose_custom_stream_content():
    """AC-A3, AC-A4: Test that the diagnostic stream yields data chunks."""
    payload = {
        "model_path": "artifacts/temp_model.pt",
        "unsafe_load": True
    }
    with client.stream("POST", "/api/diagnose/custom/stream", json=payload) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line.startswith("data: "):
                events.append(json.loads(line[6:]))
        
        assert len(events) > 0
        assert events[0]["status"] == "analyzing"
        assert any(e["status"] == "complete" for e in events)
        assert any("findings" in e for e in events)

def test_tune_runtime_stream():
    """AC-B1, AC-B2: Test that the runtime tuning stream exists."""
    payload = {
        "model_id": "llama3",
        "source": "ollama",
        "system_profile": {"device": "cpu", "gpu_vram_gb": 16}
    }
    response = client.post("/api/tune/runtime/stream", json=payload)
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

def test_estimate_inference_hardware_aware():
    """Verify that the estimator correctly identifies Apple Silicon and RAM spill."""
    # Case 1: Apple Silicon
    payload_apple = {
        "hardware_specs": {"gpu_name": "Apple M2 Ultra", "memory_bandwidth_gbps": 800, "vram_gb": 192},
        "model_metadata": {"params_b": 7, "quant_bits": 4}
    }
    response = client.post("/api/estimate/inference", json=payload_apple)
    data = response.json()
    assert data["is_apple"] is True
    assert data["is_ram_spill"] is False

    # Case 2: RAM Spill (Large model on small VRAM)
    payload_spill = {
        "hardware_specs": {"gpu_name": "RTX 3070", "memory_bandwidth_gbps": 448, "vram_gb": 8},
        "model_metadata": {"params_b": 70, "quant_bits": 4} # ~35GB model
    }
    response = client.post("/api/estimate/inference", json=payload_spill)
    data = response.json()
    assert data["is_ram_spill"] is True
    assert data["method"] in {"randomforest-ramspill", "spill-fallback"}

def test_get_recommendations():
    """Verify that the model recommendations endpoint returns a valid response."""
    response = client.get("/api/models/recommendations")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "recommendations" in data
    recs = data["recommendations"]
    assert len(recs) > 0
    
    for r in recs:
        assert "repo_id" in r
        assert "name" in r
        assert "size" in r
        assert "format" in r
        assert "description" in r
        assert "ramNeeded" in r
        assert "link" in r
        assert isinstance(r["ramNeeded"], int)
