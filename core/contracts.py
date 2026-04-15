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
    gpu_available: bool
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


class PerformanceEstimate(TypedDict):
    latency_range_ms: Tuple[float, float]
    memory_mb: float
    confidence: str
    method: str


class StrategyResult(TypedDict):
    optimization: str
    device: str
    rationale: str
    recommendation: str


class PromptOptimizationResult(TypedDict):
    original_prompt: str
    optimized_prompt: str
    suggestions: list[str]
    before_score: int
    after_score: int
