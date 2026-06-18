import os
import pytest
from fastapi.testclient import TestClient
from sysaware.server import app

@pytest.fixture
def auth_client(monkeypatch):
    # Enable API key authentication by setting environment variables
    monkeypatch.setenv("SYSAWARE_API_KEY", "test_secret_key")
    # Re-initialize the key variable in the server module
    import sysaware.server as server
    monkeypatch.setattr(server, "SYSAWARE_API_KEY", "test_secret_key")
    
    client = TestClient(app)
    return client

def test_api_key_auth_enforced_when_configured(auth_client):
    # Request without key should fail with 401
    response = auth_client.get("/api/fleet/active")
    assert response.status_code == 401
    assert "Unauthorized" in response.json()["detail"]

    # Request with invalid key should fail with 401
    response = auth_client.get("/api/fleet/active", headers={"X-API-Key": "wrong_key"})
    assert response.status_code == 401

    # Request with valid key should succeed
    response = auth_client.get("/api/fleet/active", headers={"X-API-Key": "test_secret_key"})
    assert response.status_code == 200

    # Request with Bearer Token should succeed
    response = auth_client.get("/api/fleet/active", headers={"Authorization": "Bearer test_secret_key"})
    assert response.status_code == 200

    # Public endpoint (/api/system) should still work without key
    response = auth_client.get("/api/system")
    assert response.status_code == 200

def test_admin_endpoints_require_admin_key(auth_client, monkeypatch):
    monkeypatch.setenv("SYSAWARE_ADMIN_KEY", "admin_secret_key")
    import sysaware.server as server
    # Enforce separate admin key
    
    # Try calling admin endpoint with regular api key: should get 403 Forbidden
    response = auth_client.delete("/api/telemetry/history", headers={"X-API-Key": "test_secret_key"})
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]

    # Try with admin key: should succeed (since db clear is mockable/runnable)
    response = auth_client.delete("/api/telemetry/history", headers={"X-API-Key": "admin_secret_key"})
    assert response.status_code == 200

def test_model_path_confinement():
    client = TestClient(app)
    # Outside path should be rejected
    payload = {
        "model_path": "/etc/passwd",
        "unsafe_load": False
    }
    response = client.post("/api/model/analyze", json=payload)
    assert response.status_code == 400
    assert "Model path is outside" in response.json()["detail"]

def test_proxy_host_allowlist():
    client = TestClient(app)
    # Target outside allowed loopback / proxies
    payload = {
        "host": "evil-website.com",
        "port": 1234
    }
    response = client.post("/api/lmstudio/sync", json=payload)
    assert response.status_code == 400
    assert "proxy allowlist" in response.json()["detail"]

def test_self_approval_prevention():
    client = TestClient(app)
    payload = {
        "machine_id": "test_node_id"
    }
    # If X-Machine-ID matches the node being approved, reject
    response = client.post("/api/fleet/join/approve", json=payload, headers={"X-Machine-ID": "test_node_id"})
    assert response.status_code == 400
    assert "Nodes cannot approve their own" in response.json()["detail"]

def test_production_error_masking(monkeypatch):
    import sysaware.server as server
    monkeypatch.setattr(server, "IS_PRODUCTION", True)
    
    # Analyze with non-existent allowed file should return a generic message in production
    payload = {
        "model_path": "nonexistent_model.pt",
        "unsafe_load": False
    }
    client = TestClient(app)
    response = client.post("/api/model/analyze", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Failed to load or analyze model"
