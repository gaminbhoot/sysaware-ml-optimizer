from __future__ import annotations

from collections.abc import MutableMapping
from typing import Any, Sequence

PIPELINE_STATE_KEYS = (
    "system_profile",
    "model",
    "model_analysis",
    "goal",
    "baseline",
    "strategy",
    "best_config",
    "best_model",
    "best_result",
    "prompt_optimizer_result",
    "enable_prompt_optimizer",
    "prompt_intent",
    "prompt_input",
)


def clear_pipeline_state(session_state: MutableMapping[str, Any]) -> list[str]:
    removed: list[str] = []
    for key in PIPELINE_STATE_KEYS:
        if key in session_state:
            removed.append(key)
            session_state.pop(key, None)
    return removed


def format_range(range_values: Sequence[float] | tuple[float, float]) -> str:
    if len(range_values) != 2:
        return "0.00ms – 0.00ms"
    low, high = float(range_values[0]), float(range_values[1])
    return f"{low:.2f}ms – {high:.2f}ms"


def format_memory(value: float) -> str:
    return f"{float(value):.2f} MB"


def format_gpu_name(name: str | None) -> str:
    return name if name else "None"


def has_required_inputs(session_state: MutableMapping[str, Any]) -> bool:
    return "model" in session_state and "system_profile" in session_state
