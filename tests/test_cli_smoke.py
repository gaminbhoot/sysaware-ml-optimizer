import json
from argparse import Namespace
from pathlib import Path

import pytest

import main


@pytest.fixture
def sample_report() -> dict:
    return {
        "model_path": "model.pt",
        "goal": "balanced",
        "system_profile": {"cpu_cores": 8, "ram_gb": 16.0, "ram_available_gb": 12.0, "gpu_available": True, "gpu_backend": "cuda", "gpu_name": "RTX 4070", "gpu_vram_gb": 12.0, "os": "Windows 11"},
        "model_analysis": {"model_name": "DummyModel", "num_params": 100, "trainable_params": 100, "size_mb": 0.38},
        "baseline": {"latency_range_ms": (10.0, 12.0), "memory_mb": 100.0, "confidence": "high", "method": "static"},
        "strategy": {"optimization": "fp16", "device": "cuda", "rationale": "gpu headroom available", "recommendation": "Use FP16 on GPU."},
        "best_config": {"name": "fp16", "mode": "fp16", "metadata": {"method": "fp16"}, "goal": "balanced", "score": 5.0, "evaluated_candidates": 3},
        "best_result": {"latency_range_ms": (5.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "static+micro-benchmark"},
        "prompt_optimizer": None,
    }


@pytest.fixture
def parsed_args() -> Namespace:
    return main.parse_args(["--model-path", "model.pt", "--goal", "balanced"])


def test_parse_args_accepts_required_model_path(parsed_args: Namespace) -> None:
    assert parsed_args.model_path == "model.pt"
    assert parsed_args.goal == "balanced"
    assert parsed_args.json is False
    assert parsed_args.optimize_prompt is False
    assert parsed_args.prompt_text == ""
    assert parsed_args.prompt_type == "general"


def test_parse_args_supports_json_and_prompt_flags() -> None:
    args = main.parse_args([
        "--model-path",
        "model.pt",
        "--goal",
        "memory",
        "--json",
        "--optimize-prompt",
        "--prompt-text",
        "write a better prompt",
        "--prompt-type",
        "coding",
    ])
    assert args.json is True
    assert args.optimize_prompt is True
    assert args.prompt_text == "write a better prompt"
    assert args.prompt_type == "coding"


def test_main_prints_human_readable_report(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], sample_report: dict) -> None:
    monkeypatch.setattr(main, "run_pipeline", lambda args: sample_report)
    code = main.main(["--model-path", "model.pt", "--goal", "balanced"])
    output = capsys.readouterr().out

    assert code == 0
    assert "Final Optimization Report" in output
    assert "Recommendation:" in output
    assert "Use FP16 on GPU." in output


def test_main_prints_json_when_requested(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str], sample_report: dict) -> None:
    monkeypatch.setattr(main, "run_pipeline", lambda args: sample_report)
    code = main.main(["--model-path", "model.pt", "--goal", "balanced", "--json"])
    output = capsys.readouterr().out

    assert code == 0
    parsed = json.loads(output)
    assert parsed["goal"] == "balanced"
    assert parsed["strategy"]["recommendation"] == "Use FP16 on GPU."


def test_main_returns_nonzero_for_invalid_goal() -> None:
    code = main.main(["--model-path", "model.pt", "--goal", "not-a-goal"])
    assert code == 2


def test_run_pipeline_executes_full_flow(monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    monkeypatch.setattr(main, "set_global_seed", lambda seed: calls.append(f"seed:{seed}"))
    monkeypatch.setattr(main, "get_system_profile", lambda: {"cpu_cores": 8, "ram_gb": 16.0, "ram_available_gb": 12.0, "gpu_available": True, "gpu_backend": "cuda", "gpu_name": "RTX 4070", "gpu_vram_gb": 12.0, "dgpu_name": "RTX 4070", "dgpu_vram_gb": 12.0, "igpu_name": "None", "igpu_vram_gb": 0.0, "npu_available": False, "npu_name": "None", "os": "Windows 11"})
    monkeypatch.setattr(main, "load_model_from_path", lambda path, unsafe_load=False: calls.append(f"load:{path}") or {"model": path})
    monkeypatch.setattr(main, "analyze_model", lambda model: calls.append("analyze") or {"model_name": "DummyModel", "num_params": 100, "trainable_params": 100, "size_mb": 0.38})
    monkeypatch.setattr(main, "estimate_performance", lambda model, profile: calls.append("estimate") or {"latency_range_ms": (10.0, 12.0), "memory_mb": 100.0, "confidence": "high", "method": "static"})
    monkeypatch.setattr(main, "get_strategy", lambda profile, goal, model_analysis=None: calls.append(f"strategy:{goal}") or {"optimization": "fp16", "device": "cuda", "rationale": "gpu headroom available", "recommendation": "Use FP16 on GPU."})
    def mock_autotune_generator(*args, **kwargs):
        goal = args[2] if len(args) > 2 else kwargs.get('goal', 'balanced')
        calls.append(f"autotune:{goal}")
        yield {"status": "evaluating", "candidate": "fp16"}
        yield {"status": "complete", "best_config": {"name": "fp16", "mode": "fp16", "metadata": {"method": "fp16"}, "goal": goal, "score": 5.0, "evaluated_candidates": 3}, "best_result": {"latency_range_ms": (5.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "static+micro-benchmark"}}
        return ({"name": "fp16", "mode": "fp16", "metadata": {"method": "fp16"}, "goal": goal, "score": 5.0, "evaluated_candidates": 3}, {"model": "optimized"}, {"latency_range_ms": (5.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "static+micro-benchmark"})
    
    import core.autotuner
    monkeypatch.setattr(core.autotuner, "autotune_generator", mock_autotune_generator)
    monkeypatch.setattr(main, "optimize_prompt", lambda text, prompt_type: calls.append(f"prompt:{prompt_type}") or {"original_prompt": text, "optimized_prompt": text, "suggestions": ["ok"], "before_score": 10, "after_score": 80})

    args = main.parse_args([
        "--model-path",
        "model.pt",
        "--goal",
        "balanced",
        "--optimize-prompt",
        "--prompt-text",
        "make this clearer",
        "--prompt-type",
        "analysis",
    ])
    report = main.run_pipeline(args)

    assert report["goal"] == "balanced"
    assert report["prompt_optimizer"]["after_score"] == 80
    assert calls == ["seed:42", "load:model.pt", "analyze", "estimate", "strategy:balanced", "autotune:balanced", "prompt:analysis"]


def test_run_pipeline_requires_prompt_text_when_prompt_optimizer_enabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(main, "set_global_seed", lambda seed: None)
    monkeypatch.setattr(main, "get_system_profile", lambda: {"cpu_cores": 8, "ram_gb": 16.0, "ram_available_gb": 16.0, "gpu_available": False, "gpu_backend": "cpu", "gpu_name": "None", "gpu_vram_gb": 0.0, "dgpu_name": "None", "dgpu_vram_gb": 0.0, "igpu_name": "None", "igpu_vram_gb": 0.0, "npu_available": True, "npu_name": "Intel AI Boost", "os": "Windows 11"})
    monkeypatch.setattr(main, "load_model_from_path", lambda path, unsafe_load=False: {"model": path})
    monkeypatch.setattr(main, "analyze_model", lambda model: {"model_name": "DummyModel", "num_params": 100, "trainable_params": 100, "size_mb": 0.38})
    monkeypatch.setattr(main, "estimate_performance", lambda model, profile: {"latency_range_ms": (10.0, 12.0), "memory_mb": 100.0, "confidence": "high", "method": "static"})
    monkeypatch.setattr(main, "get_strategy", lambda profile, goal, model_analysis=None: {"optimization": "int8", "device": "cpu", "rationale": "cpu fallback", "recommendation": "Use INT8."})
    def mock_autotune_gen_error(*args, **kwargs):
        goal = args[2] if len(args) > 2 else kwargs.get('goal', 'balanced')
        yield {"status": "evaluating", "candidate": "int8"}
        yield {"status": "complete", "best_config": {"name": "int8", "mode": "int8", "metadata": {}, "goal": goal, "score": 1.0, "evaluated_candidates": 3}, "best_result": {"latency_range_ms": (8.0, 9.0), "memory_mb": 50.0, "confidence": "high", "method": "int8"}}
        return ({"name": "int8", "mode": "int8", "metadata": {}, "goal": goal, "score": 1.0, "evaluated_candidates": 3}, {"model": "optimized"}, {"latency_range_ms": (8.0, 9.0), "memory_mb": 50.0, "confidence": "high", "method": "int8"})

    import core.autotuner
    monkeypatch.setattr(core.autotuner, "autotune_generator", mock_autotune_gen_error)

    args = main.parse_args(["--model-path", "model.pt", "--optimize-prompt"])
    args.prompt_text = ""

    with pytest.raises(ValueError, match="--prompt-text is required"):
        main.run_pipeline(args)


def test_cli_json_errors(monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]) -> None:
    code = main.main(["--model-path", "nonexistent.pt", "--goal", "balanced", "--json"])
    output = capsys.readouterr().out
    
    assert code == 2
    parsed = json.loads(output)
    assert parsed["status"] == "error"
    assert "Model file or directory not found:" in parsed["message"]
    assert parsed["code"] == 500

def test_load_model_from_path_rejects_missing_file(tmp_path: Path) -> None:
    missing = tmp_path / "missing.pt"
    with pytest.raises(FileNotFoundError, match="Model file or directory not found"):
        main.load_model_from_path(str(missing))


def test_security_weights_only(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    calls = []
    import sys
    import types
    
    class FakeTorch:
        @staticmethod
        def load(path, map_location, weights_only=False):
            calls.append(f"weights_only:{weights_only}")
            return {"model": path}
            
    module = types.ModuleType('torch')
    module.load = FakeTorch.load
    monkeypatch.setitem(sys.modules, 'torch', module)
    
    fake_model = tmp_path / "fake.pt"
    fake_model.touch()
    
    main.load_model_from_path(str(fake_model), unsafe_load=False)
    assert calls[-1] == "weights_only:True"
    
    main.load_model_from_path(str(fake_model), unsafe_load=True)
    assert calls[-1] == "weights_only:False"
