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

    # /api/system is now auth-protected and should require key
    response = auth_client.get("/api/system")
    assert response.status_code == 401

    response = auth_client.get("/api/system", headers={"X-API-Key": "test_secret_key"})
    assert response.status_code == 200

def test_admin_endpoints_require_admin_key(auth_client, monkeypatch):
    monkeypatch.setenv("SYSAWARE_ADMIN_KEY", "admin_secret_key")
    import sysaware.server as server
    monkeypatch.setattr(server, "SYSAWARE_ADMIN_KEY", "admin_secret_key")
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
    # If X-Machine-ID matches the node being approved, reject.
    # Note: approve is an admin route, so we must provide the admin API key.
    response = client.post(
        "/api/fleet/join/approve",
        json=payload,
        headers={"X-API-Key": "admin_test_key", "X-Machine-ID": "test_node_id"}
    )
    assert response.status_code == 400
    assert "Nodes cannot approve their own" in response.json()["detail"]

def test_production_error_masking(monkeypatch):
    import sysaware.server as server
    monkeypatch.setattr(server, "IS_PRODUCTION", True)
    
    # Analyze with non-existent allowed file should return a generic message in production
    payload = {
        "model_path": "artifacts/nonexistent_model.pt",
        "unsafe_load": False
    }
    client = TestClient(app)
    response = client.post("/api/model/analyze", json=payload)
    assert response.status_code == 400
    assert response.json()["detail"] == "Failed to load or analyze model"

def test_auth_enforced_by_default_in_dev_mode(monkeypatch):
    # Simulate dev mode with no API key set
    import sysaware.server as server
    monkeypatch.setattr(server, "ENV", "development")
    
    # We patch SYSAWARE_API_KEY to simulate what happens at startup when unset
    import secrets
    generated_key = "sysaware_" + secrets.token_hex(16)
    monkeypatch.setattr(server, "SYSAWARE_API_KEY", generated_key)
    
    client = TestClient(app)
    response = client.get("/api/fleet/active")
    assert response.status_code == 401
    
    response = client.get("/api/fleet/active", headers={"X-API-Key": generated_key})
    assert response.status_code == 200

def test_limit_upload_size_middleware_chunked():
    client = TestClient(app)
    
    # Define a generator that yields chunks
    def chunk_generator():
        # Yield 3 MB of data, which exceeds default 2 MB limit
        for _ in range(3):
            yield b"a" * (1024 * 1024)
            
    response = client.post("/api/fleet/join/request", content=chunk_generator())
    assert response.status_code == 413
    assert "payload too large" in response.json()["detail"].lower()

def test_telemetry_stream_token_auth(monkeypatch):
    # Set a fixed API key
    monkeypatch.setenv("SYSAWARE_API_KEY", "my_test_key")
    import sysaware.server as server
    monkeypatch.setattr(server, "SYSAWARE_API_KEY", "my_test_key")
    
    # Mock broker.subscribe to prevent infinite block during test stream reading
    async def mock_subscribe():
        yield "data: {}\n\n"
    monkeypatch.setattr(server.broker, "subscribe", mock_subscribe)
    
    client = TestClient(app)
    client.no_auth_inject = True
    
    # 1. Request stream-token using API key
    response = client.post("/api/auth/stream-token", headers={"X-API-Key": "my_test_key"})
    assert response.status_code == 200
    token = response.json()["token"]
    assert token.startswith("stream_")
    
    # 2. Try streaming with the token - should succeed (status 200)
    with client.stream("GET", f"/api/telemetry/stream?token={token}") as stream_res:
        assert stream_res.status_code == 200
        
    # 3. Try using the same token again - should fail with 401 (since it is one-time use)
    with client.stream("GET", f"/api/telemetry/stream?token={token}") as stream_res2:
        assert stream_res2.status_code == 401

def test_chat_stream_timeout(monkeypatch):
    import sysaware.server as server
    import time
    
    class MockClient:
        def chat_stream(self, messages, model_id):
            while True:
                yield {"choices": [{"delta": {"content": "hello"}}]}
                
    from sysaware.core.lmstudio import LMStudioClient
    monkeypatch.setattr(LMStudioClient, "chat_stream", MockClient.chat_stream)
    
    # Monkeypatch CHAT_STREAM_TIMEOUT to be near zero to trigger asyncio.timeout immediately
    monkeypatch.setattr(server, "CHAT_STREAM_TIMEOUT", 0.001)
    
    client = TestClient(app)
    payload = {
        "messages": [{"role": "user", "content": "hello"}],
        "host": "127.0.0.1",
        "port": 1234,
        "stream": True
    }
    
    with client.stream("POST", "/api/chat/stream", json=payload) as response:
        assert response.status_code == 200
        events = []
        for line in response.iter_lines():
            if line:
                decoded_line = line if isinstance(line, str) else line.decode('utf-8')
                events.append(decoded_line)
        
        assert any("timed out" in e for e in events)
