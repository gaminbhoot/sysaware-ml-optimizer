import core


def test_core_public_exports_are_available() -> None:
    assert hasattr(core, "GOALS")
    assert hasattr(core, "GOAL_LABELS")
    assert hasattr(core, "GoalType")
    assert hasattr(core, "ValidationError")
    assert hasattr(core, "validate_goal")
    assert hasattr(core, "set_global_seed")
    assert hasattr(core, "get_logger")
