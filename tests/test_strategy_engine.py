import pytest

from core.strategy_engine import get_strategy


@pytest.mark.parametrize(
    "profile,goal,expected_optimization,expected_device",
    [
        (
            {"cpu_cores": 8, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "RTX 4090", "gpu_vram_gb": 24.0},
            "latency",
            "fp16",
            "cuda",
        ),
        (
            {"cpu_cores": 4, "ram_gb": 8.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0},
            "latency",
            "int8",
            "cpu",
        ),
        (
            {"cpu_cores": 6, "ram_gb": 12.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0},
            "memory",
            "int8",
            "cpu",
        ),
        (
            {"cpu_cores": 12, "ram_gb": 32.0, "gpu_available": True, "gpu_name": "RTX 4080", "gpu_vram_gb": 16.0},
            "balanced",
            "fp16",
            "cuda",
        ),
        (
            {"cpu_cores": 2, "ram_gb": 4.0, "gpu_available": True, "gpu_name": "Old GPU", "gpu_vram_gb": 2.0},
            "balanced",
            "int8",
            "cpu",
        ),
    ],
)
def test_get_strategy_selects_expected_mode_and_device(
    profile: dict,
    goal: str,
    expected_optimization: str,
    expected_device: str,
) -> None:
    result = get_strategy(profile, goal)
    assert result["optimization"] == expected_optimization
    assert result["device"] == expected_device
    assert isinstance(result["rationale"], str)
    assert isinstance(result["recommendation"], str)
    assert result["recommendation"]


@pytest.mark.parametrize("goal", ["latency", "memory", "balanced"])
def test_get_strategy_is_deterministic_for_same_input(goal: str) -> None:
    profile = {"cpu_cores": 8, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "RTX 4070", "gpu_vram_gb": 12.0}
    first = get_strategy(profile, goal)
    second = get_strategy(profile, goal)
    assert first == second


@pytest.mark.parametrize(
    "profile",
    [
        {"cpu_cores": 16, "ram_gb": 64.0, "gpu_available": True, "gpu_name": "RTX 4090", "gpu_vram_gb": 24.0},
        {"cpu_cores": 8, "ram_gb": 12.0, "gpu_available": True, "gpu_name": "RTX 3060", "gpu_vram_gb": 6.0},
        {"cpu_cores": 4, "ram_gb": 8.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0},
    ],
)
def test_get_strategy_recommendation_mentions_goal_and_configuration(profile: dict) -> None:
    result = get_strategy(profile, "balanced")
    recommendation = result["recommendation"].lower()
    assert "balanced" in recommendation
    assert result["optimization"] in {"int8", "fp16"}
    assert result["device"] in {"cpu", "cuda"}


def test_get_strategy_requires_dictionary_profile() -> None:
    with pytest.raises(ValueError, match="Profile must be a dictionary"):
        get_strategy([], "balanced")


@pytest.mark.parametrize("goal", ["fast", "", None])
def test_get_strategy_rejects_invalid_goal(goal) -> None:
    profile = {"cpu_cores": 4, "ram_gb": 8.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0}
    with pytest.raises(ValueError, match="Unsupported goal"):
        get_strategy(profile, goal)


def test_get_strategy_rejects_missing_fields() -> None:
    profile = {"cpu_cores": 4, "ram_gb": 8.0, "gpu_available": False}
    with pytest.raises(ValueError, match="Missing fields"):
        get_strategy(profile, "memory")

def test_hardware_tiers_dynamic() -> None:
    model_analysis = {"size_mb": 2048.0}
    
    profile_strong = {"cpu_cores": 4, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "G", "gpu_vram_gb": 10.0}
    profile_modest = {"cpu_cores": 4, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "G", "gpu_vram_gb": 4.0}
    profile_limited = {"cpu_cores": 4, "ram_gb": 16.0, "gpu_available": True, "gpu_name": "G", "gpu_vram_gb": 2.0}

    s_strong = get_strategy(profile_strong, "balanced", model_analysis)
    assert "strong_gpu" in s_strong["rationale"]

    s_modest = get_strategy(profile_modest, "balanced", model_analysis)
    assert "modest_gpu" in s_modest["rationale"]

    s_limited = get_strategy(profile_limited, "balanced", model_analysis)
    assert "limited_gpu" in s_limited["rationale"]
    assert "int8" == s_limited["optimization"]


@pytest.mark.parametrize(
    "field,value",
    [
        ("cpu_cores", -1),
        ("ram_gb", -2.0),
        ("gpu_vram_gb", -3.0),
    ],
)
def test_get_strategy_rejects_negative_numeric_fields(field: str, value: float) -> None:
    profile = {"cpu_cores": 4, "ram_gb": 8.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0}
    profile[field] = value
    with pytest.raises(ValueError, match="must be non-negative"):
        get_strategy(profile, "latency")


def test_get_strategy_includes_profile_details_in_rationale() -> None:
    profile = {"cpu_cores": 2, "ram_gb": 6.0, "gpu_available": False, "gpu_name": "None", "gpu_vram_gb": 0.0}
    result = get_strategy(profile, "memory")
    assert "cpu_cores=2" in result["rationale"]
    assert "ram_gb=6.0" in result["rationale"]


def test_get_strategy_uses_gpu_path_for_latency_when_headroom_exists() -> None:
    profile = {"cpu_cores": 10, "ram_gb": 24.0, "gpu_available": True, "gpu_name": "RTX A5000", "gpu_vram_gb": 24.0}
    result = get_strategy(profile, "latency")
    assert result["optimization"] == "fp16"
    assert result["device"] == "cuda"


def test_get_strategy_falls_back_to_cpu_for_constrained_gpu_profile() -> None:
    profile = {"cpu_cores": 8, "ram_gb": 4.0, "gpu_available": True, "gpu_name": "Tiny GPU", "gpu_vram_gb": 2.0}
    result = get_strategy(profile, "latency")
    assert result["optimization"] == "int8"
    assert result["device"] == "cpu"
