import pytest

import main as main_module
from main import main, parse_args


def test_parse_args_with_required_model_path() -> None:
    args = parse_args(["--model-path", "m.pt"])
    assert args.goal == "balanced"
    assert args.seed == 42
    assert args.model_path == "m.pt"


def test_parse_args_with_custom_values() -> None:
    args = parse_args(["--goal", "memory", "--seed", "7", "--model-path", "m.pt"])
    assert args.goal == "memory"
    assert args.seed == 7
    assert args.model_path == "m.pt"


def test_parse_args_requires_model_path() -> None:
    with pytest.raises(SystemExit):
        parse_args([])


def test_main_returns_zero_for_valid_input(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        main_module,
        "run_pipeline",
        lambda args: {
            "model_path": args.model_path,
            "goal": args.goal,
            "system_profile": {"cpu_cores": 4, "ram_gb": 8.0, "gpu_name": "None", "os": "Windows 11"},
            "model_analysis": {"model_name": "Dummy", "num_params": 1, "trainable_params": 1, "size_mb": 0.0},
            "baseline": {"latency_range_ms": (1.0, 2.0), "memory_mb": 3.0},
            "strategy": {"recommendation": "Use INT8."},
            "best_config": {"name": "int8", "mode": "int8"},
            "best_result": {"latency_range_ms": (0.5, 1.0), "memory_mb": 2.0},
            "prompt_optimizer": None,
        },
    )
    assert main(["--model-path", "m.pt", "--goal", "latency", "--seed", "123"]) == 0


def test_main_returns_non_zero_for_invalid_goal() -> None:
    assert main(["--model-path", "m.pt", "--goal", "not-a-goal"]) == 2
