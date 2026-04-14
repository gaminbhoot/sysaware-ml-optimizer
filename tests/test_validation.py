import random
import sys
from types import SimpleNamespace

import pytest

from core.validation import (
    ValidationError,
    require_fields,
    set_global_seed,
    validate_goal,
    validate_non_negative_number,
)


@pytest.mark.parametrize("goal", ["latency", "memory", "balanced"])
def test_validate_goal_accepts_supported_values(goal: str) -> None:
    assert validate_goal(goal) == goal


def test_validate_goal_rejects_invalid_value() -> None:
    with pytest.raises(ValidationError, match="Unsupported goal"):
        validate_goal("speed")


def test_require_fields_passes_with_all_fields_present() -> None:
    data = {"a": 1, "b": 2}
    require_fields(data, ["a", "b"], "sample")


def test_require_fields_raises_with_missing_fields() -> None:
    with pytest.raises(ValidationError, match="Missing fields"):
        require_fields({"a": 1}, ["a", "b", "c"], "sample")


def test_validate_non_negative_number_accepts_int_and_float() -> None:
    assert validate_non_negative_number(0, "x") == 0.0
    assert validate_non_negative_number(3.14, "x") == 3.14


def test_validate_non_negative_number_rejects_negative_number() -> None:
    with pytest.raises(ValidationError, match="must be non-negative"):
        validate_non_negative_number(-1, "x")


def test_validate_non_negative_number_rejects_string() -> None:
    with pytest.raises(ValidationError, match="must be numeric"):
        validate_non_negative_number("12", "x")


def test_validate_non_negative_number_rejects_boolean_edge_case() -> None:
    with pytest.raises(ValidationError, match="must be numeric"):
        validate_non_negative_number(True, "x")


def test_set_global_seed_makes_random_deterministic() -> None:
    set_global_seed(1234)
    first = random.random()
    set_global_seed(1234)
    second = random.random()
    assert first == second


def test_set_global_seed_gracefully_handles_unexpected_torch_module(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setitem(sys.modules, "torch", SimpleNamespace())
    assert set_global_seed(99) == 99
