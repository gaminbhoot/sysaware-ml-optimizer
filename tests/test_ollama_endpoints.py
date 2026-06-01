import pytest
from fastapi.testclient import TestClient
from backend.server import app
import unittest.mock as mock

client = TestClient(app)

@pytest.fixture
def mock_requests():
    with mock.patch("requests.get") as mock_get, mock.patch("requests.post") as mock_post:
        mock_obj = mock.Mock()
        mock_obj.get = mock_get
        mock_obj.post = mock_post
        yield mock_obj

def test_sync_ollama_success(mock_requests):
    # Mock /api/ps to show llama3 is loaded
    mock_ps_response = mock.Mock()
    mock_ps_response.status_code = 200
    mock_ps_response.json.return_value = {
        "models": [{"name": "llama3:latest"}]
    }

    # Mock /api/tags to show llama3:latest details
    mock_tags_response = mock.Mock()
    mock_tags_response.status_code = 200
    mock_tags_response.json.return_value = {
        "models": [
            {
                "name": "llama3:latest",
                "size": 4700000000,
                "details": {
                    "family": "llama",
                    "parameter_size": "8B",
                    "quantization_level": "Q4_0",
                    "format": "gguf"
                }
            }
        ]
    }

    def mock_get(url, *args, **kwargs):
        if url.endswith("/api/ps"):
            return mock_ps_response
        elif url.endswith("/api/tags"):
            return mock_tags_response
        return mock.Mock(status_code=404)

    mock_requests.get.side_effect = mock_get

    # Call /api/ollama/sync
    payload = {
        "host": "127.0.0.1",
        "port": 11434,
        "model_id": "llama3:latest"
    }
    response = client.post("/api/ollama/sync", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["analysis"]["model_name"] == "llama3:latest"
    assert data["analysis"]["loaded"] is True
    assert data["analysis"]["num_params"] == 8000000000

def test_sync_ollama_not_found(mock_requests):
    # Empty ps response
    mock_ps_response = mock.Mock()
    mock_ps_response.status_code = 200
    mock_ps_response.json.return_value = {"models": []}

    # Empty tags response
    mock_tags_response = mock.Mock()
    mock_tags_response.status_code = 200
    mock_tags_response.json.return_value = {"models": []}

    def mock_get(url, *args, **kwargs):
        if url.endswith("/api/ps"):
            return mock_ps_response
        elif url.endswith("/api/tags"):
            return mock_tags_response
        return mock.Mock(status_code=404)

    mock_requests.get.side_effect = mock_get

    payload = {
        "host": "127.0.0.1",
        "port": 11434
    }
    response = client.post("/api/ollama/sync", json=payload)
    assert response.status_code == 404
    assert "No loaded model found in Ollama" in response.json()["detail"]

def test_list_ollama_models(mock_requests):
    mock_ps_response = mock.Mock()
    mock_ps_response.status_code = 200
    mock_ps_response.json.return_value = {
        "models": [{"name": "llama3:latest"}]
    }

    mock_tags_response = mock.Mock()
    mock_tags_response.status_code = 200
    mock_tags_response.json.return_value = {
        "models": [
            {
                "name": "llama3:latest",
                "size": 4700000000,
                "details": {"family": "llama", "parameter_size": "8B"}
            },
            {
                "name": "phi3:latest",
                "size": 2200000000,
                "details": {"family": "phi3", "parameter_size": "3.8B"}
            }
        ]
    }

    def mock_get(url, *args, **kwargs):
        if url.endswith("/api/ps"):
            return mock_ps_response
        elif url.endswith("/api/tags"):
            return mock_tags_response
        return mock.Mock(status_code=404)

    mock_requests.get.side_effect = mock_get

    response = client.get("/api/ollama/models?host=127.0.0.1&port=11434")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    models = data["models"]
    assert len(models) == 2
    
    # Check llama3 is loaded
    llama3 = next(m for m in models if m["model_name"] == "llama3:latest")
    assert llama3["loaded"] is True
    
    # Check phi3 is not loaded
    phi3 = next(m for m in models if m["model_name"] == "phi3:latest")
    assert phi3["loaded"] is False

def test_load_ollama_model(mock_requests):
    mock_post_response = mock.Mock()
    mock_post_response.status_code = 200
    mock_requests.post.return_value = mock_post_response

    payload = {
        "host": "127.0.0.1",
        "port": 11434,
        "model_id": "llama3:latest"
    }
    response = client.post("/api/ollama/load", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    # Verify post was called with correct url and body
    mock_requests.post.assert_called_once_with(
        "http://127.0.0.1:11434/api/generate",
        json={"model": "llama3:latest"},
        timeout=60
    )

def test_unload_ollama_model(mock_requests):
    # Mock /api/ps first to get loaded models list inside unload_model
    mock_ps_response = mock.Mock()
    mock_ps_response.status_code = 200
    mock_ps_response.json.return_value = {
        "models": [{"name": "llama3:latest"}]
    }
    mock_requests.get.return_value = mock_ps_response

    mock_post_response = mock.Mock()
    mock_post_response.status_code = 200
    mock_requests.post.return_value = mock_post_response

    payload = {
        "host": "127.0.0.1",
        "port": 11434,
        "model_id": "llama3:latest"
    }
    response = client.post("/api/ollama/unload", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "success"
    
    mock_requests.post.assert_called_once_with(
        "http://127.0.0.1:11434/api/generate",
        json={"model": "llama3:latest", "keep_alive": 0},
        timeout=10
    )
