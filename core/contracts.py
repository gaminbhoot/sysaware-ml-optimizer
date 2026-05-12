from typing import Dict, Literal, TypedDict, Tuple


GoalType = Literal["latency", "memory", "balanced"]

GOALS: Tuple[GoalType, GoalType, GoalType] = ("latency", "memory", "balanced")

GOAL_LABELS: Dict[GoalType, str] = {
    "latency": "⚡  Low Latency",
    "memory": "🧠  Low Memory",
    "balanced": "⚖   Balanced",
}


class SystemProfile(TypedDict):
    os: str
    cpu_cores: int
    ram_gb: float
    ram_available_gb: float
    gpu_available: bool
    gpu_backend: str
    gpu_name: str
    gpu_vram_gb: float
    dgpu_name: str
    dgpu_vram_gb: float
    igpu_name: str
    igpu_vram_gb: float
    npu_available: bool
    npu_name: str


class ModelAnalysis(TypedDict):
    model_name: str
    num_params: int
    trainable_params: int
    size_mb: float
    layer_types: Dict[str, int]


class PerformanceEstimate(TypedDict, total=False):
    latency_range_ms: Tuple[float, float]
    memory_mb: float
    confidence: str
    method: str
    # Real-world LLM metrics
    decode_tokens_per_sec: float
    prefill_latency_ms: float
    wall_clock_ms: float


class StrategyResult(TypedDict):
    optimization: str
    device: str
    rationale: str
    recommendation: str


class PromptOptimizationResult(TypedDict):
    original_prompt: str
    optimized_prompt: str
    suggestions: list[str]
    removed_words: list[str]
    before_score: int
    after_score: int
