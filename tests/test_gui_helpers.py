from gui.helpers import clear_pipeline_state, format_gpu_name, format_memory, format_range, has_required_inputs


def test_clear_pipeline_state_removes_known_keys() -> None:
    session_state = {
        "system_profile": {},
        "model": object(),
        "model_analysis": {},
        "goal": "balanced",
        "baseline": {},
        "strategy": {},
        "best_config": {},
        "best_model": {},
        "best_result": {},
        "prompt_optimizer_result": {},
        "enable_prompt_optimizer": True,
        "prompt_intent": "analysis",
        "prompt_input": "hello",
        "other": "keep",
    }

    removed = clear_pipeline_state(session_state)

    assert set(removed) == {
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
    }
    assert session_state == {"other": "keep"}


def test_clear_pipeline_state_is_idempotent() -> None:
    session_state = {"other": "keep"}
    assert clear_pipeline_state(session_state) == []
    assert clear_pipeline_state(session_state) == []


def test_format_range_formats_two_values() -> None:
    assert format_range((1, 2)) == "1.00ms – 2.00ms"


def test_format_range_handles_bad_length() -> None:
    assert format_range((1,)) == "0.00ms – 0.00ms"


def test_format_memory_formats_two_decimals() -> None:
    assert format_memory(12.3456) == "12.35 MB"


def test_format_gpu_name_defaults_to_none() -> None:
    assert format_gpu_name(None) == "None"
    assert format_gpu_name("") == "None"
    assert format_gpu_name("RTX 4060") == "RTX 4060"


def test_has_required_inputs_checks_key_presence() -> None:
    assert has_required_inputs({"model": object(), "system_profile": {}}) is True
    assert has_required_inputs({"model": object()}) is False
