import re

with open("tests/test_cli_smoke.py", "r") as f:
    content = f.read()

# Replace the autotune mock in test_run_pipeline_executes_full_flow
mock_code1 = """    def mock_autotune_generator(*args, **kwargs):
        goal = args[2] if len(args) > 2 else kwargs.get('goal', 'balanced')
        calls.append(f"autotune:{goal}")
        yield {"status": "evaluating", "candidate": "fp16"}
        yield {"status": "complete", "best_config": {"name": "fp16", "mode": "fp16", "metadata": {"method": "fp16"}, "goal": goal, "score": 5.0, "evaluated_candidates": 3}, "best_result": {"latency_range_ms": (5.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "static+micro-benchmark"}}
        return ({"name": "fp16", "mode": "fp16", "metadata": {"method": "fp16"}, "goal": goal, "score": 5.0, "evaluated_candidates": 3}, {"model": "optimized"}, {"latency_range_ms": (5.0, 7.0), "memory_mb": 70.0, "confidence": "high", "method": "static+micro-benchmark"})
    
    import core.autotuner
    monkeypatch.setattr(core.autotuner, "autotune_generator", mock_autotune_generator)"""

content = re.sub(
    r'monkeypatch\.setattr\(main, "autotune".*?\)',
    mock_code1,
    content,
    count=1,
    flags=re.DOTALL
)

# Replace the autotune mock in test_run_pipeline_requires_prompt_text_when_prompt_optimizer_enabled
mock_code2 = """    def mock_autotune_gen_error(*args, **kwargs):
        goal = args[2] if len(args) > 2 else kwargs.get('goal', 'balanced')
        yield {"status": "complete", "best_config": {"name": "int8", "mode": "int8", "metadata": {}, "goal": goal, "score": 1.0, "evaluated_candidates": 3}, "best_result": {"latency_range_ms": (8.0, 9.0), "memory_mb": 50.0, "confidence": "high", "method": "int8"}}
        return ({"name": "int8", "mode": "int8", "metadata": {}, "goal": goal, "score": 1.0, "evaluated_candidates": 3}, {"model": "optimized"}, {"latency_range_ms": (8.0, 9.0), "memory_mb": 50.0, "confidence": "high", "method": "int8"})

    import core.autotuner
    monkeypatch.setattr(core.autotuner, "autotune_generator", mock_autotune_gen_error)"""

content = re.sub(
    r'monkeypatch\.setattr\(main, "autotune".*?\)',
    mock_code2,
    content,
    count=1,
    flags=re.DOTALL
)

with open("tests/test_cli_smoke.py", "w") as f:
    f.write(content)
