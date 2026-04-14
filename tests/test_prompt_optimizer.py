import pytest

from core.prompt_optimizer import (
    INTENT_HINTS,
    _has_constraints,
    _has_context,
    _has_output_hint,
    _is_long_enough,
    _normalize_spaces,
    build_suggestions,
    optimize_prompt,
    score_prompt,
)


@pytest.mark.parametrize(
    "raw, expected",
    [
        (" hello   world ", "hello world"),
        ("line1\nline2\nline3", "line1 line2 line3"),
        ("\t spaced\ttext ", "spaced text"),
        ("", ""),
    ],
)
def test_normalize_spaces(raw: str, expected: str) -> None:
    assert _normalize_spaces(raw) == expected


@pytest.mark.parametrize(
    "text, expected",
    [
        ("return output in json format", True),
        ("use bullet list", True),
        ("write a short response", False),
        ("present a table", True),
        ("just answer", False),
    ],
)
def test_has_output_hint(text: str, expected: bool) -> None:
    assert _has_output_hint(text) is expected


@pytest.mark.parametrize(
    "text, expected",
    [
        ("you must keep it brief", True),
        ("avoid jargon", True),
        ("do not include examples", True),
        ("explain it", False),
        ("only provide steps", True),
    ],
)
def test_has_constraints(text: str, expected: bool) -> None:
    assert _has_constraints(text) is expected


@pytest.mark.parametrize(
    "text, expected",
    [
        ("context: we are building a school app", True),
        ("for a non-technical audience", True),
        ("because this is for production", True),
        ("write code", False),
        ("project requirement: use python", True),
    ],
)
def test_has_context(text: str, expected: bool) -> None:
    assert _has_context(text) is expected


@pytest.mark.parametrize(
    "text, expected",
    [
        ("one two three", False),
        ("one two three four five six seven eight nine", False),
        ("one two three four five six seven eight nine ten", True),
        ("word " * 12, True),
    ],
)
def test_is_long_enough(text: str, expected: bool) -> None:
    assert _is_long_enough(text) is expected


def test_score_prompt_empty_is_zero() -> None:
    assert score_prompt("") == 0


@pytest.mark.parametrize(
    "prompt, expected_score",
    [
        ("short", 0),
        ("this prompt has context for project and should be concise", 75),
        ("please return json format", 50),
        (
            "for this project context, you must provide a bullet list with steps and keep max 5 items",
            100,
        ),
    ],
)
def test_score_prompt_expected_buckets(prompt: str, expected_score: int) -> None:
    assert score_prompt(prompt) == expected_score


@pytest.mark.parametrize(
    "prompt, expected_tip_substrings",
    [
        ("", ["Add more details", "Include project or audience context", "Add constraints", "Specify output format"]),
        ("please summarize this", ["Add more details", "Include project or audience context", "Add constraints", "Specify output format"]),
        (
            "for this project audience, provide json format",
            ["Add constraints"],
        ),
        (
            "for this project audience, you must avoid fluff and use bullet list format",
            ["Prompt already has good structure"],
        ),
    ],
)
def test_build_suggestions_coverage(prompt: str, expected_tip_substrings: list[str]) -> None:
    suggestions = build_suggestions(prompt)
    for expected in expected_tip_substrings:
        assert any(expected in tip for tip in suggestions)


def test_optimize_prompt_empty_input() -> None:
    result = optimize_prompt("", "general")
    assert result["optimized_prompt"] == ""
    assert result["before_score"] == 0
    assert result["after_score"] == 0
    assert result["suggestions"]


@pytest.mark.parametrize("intent", ["general", "coding", "analysis", "creative"])
def test_optimize_prompt_includes_intent_goal_text(intent: str) -> None:
    result = optimize_prompt("Build an API endpoint for users", intent)
    assert INTENT_HINTS[intent] in result["optimized_prompt"]


def test_optimize_prompt_unknown_intent_falls_back_to_general() -> None:
    result = optimize_prompt("Design a backend service", "unknown-intent")
    assert INTENT_HINTS["general"] in result["optimized_prompt"]


@pytest.mark.parametrize(
    "prompt",
    [
        "summarize this text",
        "write code",
        "optimize my cv",
        "create an onboarding email",
        "make a sql query",
        "explain docker networking",
    ],
)
def test_optimize_prompt_score_never_decreases(prompt: str) -> None:
    result = optimize_prompt(prompt, "general")
    assert result["after_score"] >= result["before_score"]


@pytest.mark.parametrize(
    "prompt,intent",
    [
        ("write a clean python function", "coding"),
        ("analyze two cloud cost options", "analysis"),
        ("draft a campaign tagline", "creative"),
        ("plan a task list", "general"),
        ("explain a security risk", "analysis"),
        ("make this prompt better", "general"),
    ],
)
def test_optimize_prompt_result_shape(prompt: str, intent: str) -> None:
    result = optimize_prompt(prompt, intent)
    assert set(result.keys()) == {
        "original_prompt",
        "optimized_prompt",
        "suggestions",
        "before_score",
        "after_score",
    }
    assert isinstance(result["optimized_prompt"], str)
    assert isinstance(result["suggestions"], list)
    assert isinstance(result["before_score"], int)
    assert isinstance(result["after_score"], int)


@pytest.mark.parametrize(
    "prompt",
    [
        "for this project audience, return json and do not add extra text",
        "context for product docs, must use bullet list and max 6 points",
        "because this is for executives, provide table format and avoid jargon",
    ],
)
def test_build_suggestions_can_report_good_structure(prompt: str) -> None:
    suggestions = build_suggestions(prompt)
    assert any("Prompt already has good structure" in s for s in suggestions)


def test_optimize_prompt_normalizes_internal_spacing() -> None:
    result = optimize_prompt("   write    me   a    summary   ", "general")
    assert "Task: write me a summary" in result["optimized_prompt"]


def test_score_prompt_whitespace_only_is_zero() -> None:
    assert score_prompt("   \n\t  ") == 0


def test_build_suggestions_returns_non_empty_list() -> None:
    suggestions = build_suggestions("short")
    assert isinstance(suggestions, list)
    assert len(suggestions) >= 1

def test_prompt_algorithmic_reduction() -> None:
    # Test that the prompt optimizer trims filler strings
    verbose_prompt = "Please can you write a python script that does X?"
    result = optimize_prompt(verbose_prompt, "coding")
    
    # Should strip filler words like "please can you"
    optimized = result["optimized_prompt"].lower()
    
    assert "please can you" not in optimized
    assert "write a python script" in optimized
