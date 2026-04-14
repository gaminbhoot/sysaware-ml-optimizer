from types import SimpleNamespace

import pytest

import core.autotuner as autotuner


class DummyModel:
    pass


@pytest.fixture
def sample_profile() -> dict:
    return {"cpu_cores": 8, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "RTX 4070", "gpu_vram_gb": 12.0}


@pytest.fixture
def candidate_maps():
    return {
        "baseline": {
            "mode": "none",
            "result": {"latency_range_ms": (10.0, 20.0), "memory_mb": 100.0, "confidence": "high", "method": "baseline"},
        },
        "int8": {
            "mode": "int8",
            "result": {"latency_range_ms": (8.0, 12.0), "memory_mb": 60.0, "confidence": "high", "method": "static+micro-benchmark"},
        },
        "fp16": {
            "mode": "fp16",
            "result": {"latency_range_ms": (5.0, 9.0), "memory_mb": 80.0, "confidence": "high", "method": "static+micro-benchmark"},
        },
    }


@pytest.mark.parametrize("goal,expected_name", [("latency", "fp16"), ("memory", "int8"), ("balanced", "int8")])
def test_autotune_selects_best_candidate_by_goal(monkeypatch: pytest.MonkeyPatch, sample_profile: dict, candidate_maps: dict, goal: str, expected_name: str) -> None:
    calls = []

    def fake_estimate_performance(model, profile):
        return model["result"]

    def fake_optimize_model(model, profile, mode="int8"):
        calls.append(mode)
        mapping = candidate_maps[mode]
        return {"mode": mode, "result": mapping["result"]}, {"method": mode, "device": "cpu", "applied": mode != "none", "skipped_reasons": []}

    def fake_baseline_estimate(model, profile):
        return candidate_maps["baseline"]["result"]

    monkeypatch.setattr(autotuner, "optimize_model", fake_optimize_model)
    monkeypatch.setattr(autotuner, "estimate_performance", fake_estimate_performance)

    # Patch baseline helper by routing through estimate_performance and keeping model as a dict.
    model = {"name": "dummy", "result": candidate_maps["baseline"]["result"]}
    monkeypatch.setattr(autotuner, "estimate_performance", lambda model, profile: model["result"])

    def fake_baseline(model_arg, profile_arg):
        return model, {"method": "baseline", "device": "original", "applied": False, "skipped_reasons": ["baseline candidate"]}, candidate_maps["baseline"]["result"]

    monkeypatch.setattr(autotuner, "_baseline_candidate", fake_baseline)

    best_config, best_model, best_result = autotuner.autotune(model, sample_profile, goal)

    assert best_config["name"] == expected_name
    assert best_config["mode"] == expected_name
    assert best_config["goal"] == goal
    assert best_config["evaluated_candidates"] == 3
    assert best_model == best_result or isinstance(best_model, dict)
    assert calls == ["int8", "fp16"]


@pytest.mark.parametrize("goal", ["latency", "memory", "balanced"])
def test_autotune_evaluates_at_most_three_candidates(monkeypatch: pytest.MonkeyPatch, sample_profile: dict, goal: str) -> None:
    seen_modes: list[str] = []

    baseline_result = {"latency_range_ms": (9.0, 10.0), "memory_mb": 90.0, "confidence": "high", "method": "baseline"}
    int8_result = {"latency_range_ms": (7.0, 8.0), "memory_mb": 50.0, "confidence": "high", "method": "int8"}
    fp16_result = {"latency_range_ms": (6.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "fp16"}

    monkeypatch.setattr(autotuner, "_baseline_candidate", lambda model, profile: (model, {"method": "baseline"}, baseline_result))
    monkeypatch.setattr(
        autotuner,
        "optimize_model",
        lambda model, profile, mode="int8": (
            seen_modes.append(mode) or {"mode": mode},
            {"method": mode, "device": "cpu", "applied": True, "skipped_reasons": []},
        ),
    )
    monkeypatch.setattr(
        autotuner,
        "estimate_performance",
        lambda model, profile: int8_result if model.get("mode") == "int8" else fp16_result,
    )

    best_config, best_model, best_result = autotuner.autotune(DummyModel(), sample_profile, goal)
    assert best_config["evaluated_candidates"] == 3
    assert seen_modes == ["int8", "fp16"]
    assert best_result["latency_range_ms"] in {baseline_result["latency_range_ms"], int8_result["latency_range_ms"], fp16_result["latency_range_ms"]}


@pytest.mark.parametrize("goal", ["latency", "memory", "balanced"])
def test_autotune_returns_structured_best_config(monkeypatch: pytest.MonkeyPatch, sample_profile: dict, goal: str) -> None:
    baseline_result = {"latency_range_ms": (11.0, 12.0), "memory_mb": 95.0, "confidence": "high", "method": "baseline"}
    int8_result = {"latency_range_ms": (8.0, 9.0), "memory_mb": 55.0, "confidence": "high", "method": "int8"}
    fp16_result = {"latency_range_ms": (6.0, 7.0), "memory_mb": 75.0, "confidence": "high", "method": "fp16"}

    monkeypatch.setattr(autotuner, "_baseline_candidate", lambda model, profile: (model, {"method": "baseline", "device": "original"}, baseline_result))
    monkeypatch.setattr(
        autotuner,
        "optimize_model",
        lambda model, profile, mode="int8": (
            {"mode": mode},
            {"method": mode, "device": "cpu" if mode == "int8" else "cuda", "applied": True, "skipped_reasons": []},
        ),
    )
    monkeypatch.setattr(
        autotuner,
        "estimate_performance",
        lambda model, profile: int8_result if model.get("mode") == "int8" else fp16_result,
    )

    best_config, best_model, best_result = autotuner.autotune(DummyModel(), sample_profile, goal)
    assert set(best_config.keys()) == {"name", "mode", "metadata", "goal", "score", "evaluated_candidates"}
    assert isinstance(best_config["metadata"], dict)
    assert best_config["goal"] == goal
    assert isinstance(best_result, dict)


def test_autotune_rejects_none_model(sample_profile: dict) -> None:
    with pytest.raises(ValueError, match="Model cannot be None"):
        autotuner.autotune(None, sample_profile, "balanced")


def test_autotune_rejects_invalid_profile() -> None:
    with pytest.raises(ValueError, match="Profile must be a dictionary"):
        autotuner.autotune(DummyModel(), [], "balanced")


@pytest.mark.parametrize("goal", ["fast", "", None])
def test_autotune_rejects_invalid_goal(goal) -> None:
    with pytest.raises(ValueError, match="Unsupported goal"):
        autotuner.autotune(DummyModel(), {"cpu_cores": 1, "ram_gb": 1.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0}, goal)


def test_autotune_score_function_prefers_lower_latency_for_latency_goal() -> None:
    fast = {"latency_range_ms": (1.0, 2.0), "memory_mb": 100.0, "confidence": "high", "method": "x"}
    slow = {"latency_range_ms": (10.0, 20.0), "memory_mb": 1.0, "confidence": "high", "method": "x"}
    assert autotuner._candidate_score(fast, "latency") < autotuner._candidate_score(slow, "latency")


def test_autotune_score_function_prefers_lower_memory_for_memory_goal() -> None:
    low_mem = {"latency_range_ms": (10.0, 20.0), "memory_mb": 5.0, "confidence": "high", "method": "x"}
    high_mem = {"latency_range_ms": (1.0, 2.0), "memory_mb": 50.0, "confidence": "high", "method": "x"}
    assert autotuner._candidate_score(low_mem, "memory") < autotuner._candidate_score(high_mem, "memory")


def test_autotune_score_function_balanced_uses_weighted_combination() -> None:
    a = {"latency_range_ms": (4.0, 5.0), "memory_mb": 20.0, "confidence": "high", "method": "x"}
    b = {"latency_range_ms": (5.0, 6.0), "memory_mb": 5.0, "confidence": "high", "method": "x"}
    assert autotuner._candidate_score(a, "balanced") != autotuner._candidate_score(b, "balanced")
