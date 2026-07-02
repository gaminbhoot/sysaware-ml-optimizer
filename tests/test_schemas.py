import pytest
from pydantic import ValidationError
from sysaware.api.schemas import (
    ErrorDetail,
    JSONResponseEnvelope,
    SSEEventEnvelope,
    AnalyzeRequest,
    PromptRequest,
    ChatRequest,
    BaselineRequest,
)

def test_error_detail_validation():
    # Valid model
    err = ErrorDetail(code="NOT_FOUND", message="Model path not found", details={"path": "/invalid"})
    assert err.code == "NOT_FOUND"
    assert err.message == "Model path not found"
    assert err.details == {"path": "/invalid"}

    # Invalid - missing code
    with pytest.raises(ValidationError):
        ErrorDetail(message="Missing code")

def test_json_response_envelope():
    # Success envelope
    resp = JSONResponseEnvelope(ok=True, data={"result": "success"})
    assert resp.ok is True
    assert resp.data == {"result": "success"}
    assert resp.error is None

    # Error envelope
    err = ErrorDetail(code="OOM", message="Out of memory")
    resp_err = JSONResponseEnvelope(ok=False, error=err)
    assert resp_err.ok is False
    assert resp_err.data is None
    assert resp_err.error.code == "OOM"

def test_sse_event_envelope():
    event = SSEEventEnvelope(status="progress", step="loading", message="50% loaded", data={"pct": 50})
    assert event.status == "progress"
    assert event.step == "loading"
    assert event.message == "50% loaded"
    assert event.data == {"pct": 50}

def test_analyze_request_defaults():
    req = AnalyzeRequest(model_path="/path/to/model")
    assert req.model_path == "/path/to/model"
    assert req.unsafe_load is False

def test_prompt_request_defaults():
    req = PromptRequest(prompt="Hello")
    assert req.prompt == "Hello"
    assert req.intent == "general"

def test_chat_request_defaults():
    req = ChatRequest(messages=[{"role": "user", "content": "hi"}])
    assert req.messages[0].role == "user"
    assert req.model_id is None
    assert req.host == "127.0.0.1"
    assert req.port == 1234
    assert req.stream is True

def test_baseline_request_validation():
    # Invalid - missing system_profile
    with pytest.raises(ValidationError):
        BaselineRequest(model_path="/path/to/model")
