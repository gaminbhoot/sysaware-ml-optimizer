import random
from typing import Any, Iterable

from .contracts import GOALS, GoalType


class ValidationError(ValueError):
    """Raised when pipeline inputs do not match expected contracts."""


def validate_goal(goal: str) -> GoalType:
    if goal not in GOALS:
        supported = ", ".join(GOALS)
        raise ValidationError(f"Unsupported goal '{goal}'. Supported goals: {supported}")
    return goal  # type: ignore[return-value]


def require_fields(data: dict[str, Any], required: Iterable[str], context: str) -> None:
    missing = [k for k in required if k not in data]
    if missing:
        joined = ", ".join(missing)
        raise ValidationError(f"Missing fields for {context}: {joined}")


def validate_non_negative_number(value: Any, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValidationError(f"Field '{field_name}' must be numeric")
    value_f = float(value)
    if value_f < 0:
        raise ValidationError(f"Field '{field_name}' must be non-negative")
    return value_f


def set_global_seed(seed: int = 42) -> int:
    random.seed(seed)
    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except Exception:
        # Torch may not be installed in some test environments.
        pass
    return seed
