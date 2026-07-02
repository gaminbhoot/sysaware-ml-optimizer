from pydantic import BaseModel

class AnalyzeRequest(BaseModel):
    model_path: str
    unsafe_load: bool = False

class BaselineRequest(BaseModel):
    model_path: str
    system_profile: dict

class StrategyRequest(BaseModel):
    system_profile: dict
    goal: str
    model_analysis: dict | None = None

class PromptRequest(BaseModel):
    prompt: str
    intent: str = "general"

class AutotuneRequest(BaseModel):
    model_path: str
    system_profile: dict
    goal: str
    unsafe_load: bool = False

class HeartbeatRequest(BaseModel):
    machine_id: str
    hardware_profile: dict | None = None
    status: str = "idle"

class BlacklistEntry(BaseModel):
    machine_id: str
    backend: str
    reason: str

class JoinRequest(BaseModel):
    machine_id: str

class TelemetryReport(BaseModel):
    machine_id: str
    model_hash: str = "unknown"
    hardware_profile: dict
    goal: str
    latency_range: list[float]
    memory_mb: float
    decode_tokens_per_sec: float | None = None
    prefill_latency_ms: float | None = None

class ModelRegisterRequest(BaseModel):
    model_hash: str
    model_name: str
    reference_latency: float
    reference_memory_mb: float
    reference_throughput: float = 0.0
    metadata: dict | None = None

class DriftRequest(BaseModel):
    model_hash: str
    current_latency: float
    current_throughput: float | None = None

class LMStudioSyncRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 1234
    model_id: str | None = None

class ModelLoadRequest(BaseModel):
    model_id: str
    host: str = "127.0.0.1"
    port: int = 1234

class UnloadRequest(BaseModel):
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 1234

class OllamaSyncRequest(BaseModel):
    host: str = "127.0.0.1"
    port: int = 11434
    model_id: str | None = None

class OllamaLoadRequest(BaseModel):
    model_id: str
    host: str = "127.0.0.1"
    port: int = 11434

class OllamaUnloadRequest(BaseModel):
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 11434

class DiagnosticRequest(BaseModel):
    model_path: str
    unsafe_load: bool = False

class RuntimeTuneRequest(BaseModel):
    model_id: str
    source: str  # lms, ollama, olx
    system_profile: dict

class InferenceEstimateRequest(BaseModel):
    hardware_specs: dict
    model_metadata: dict

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model_id: str | None = None
    host: str = "127.0.0.1"
    port: int = 1234
    stream: bool = True
