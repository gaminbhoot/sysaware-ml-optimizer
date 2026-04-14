from core.contracts import GOALS, GOAL_LABELS


def test_goals_are_stable_and_ordered() -> None:
    assert GOALS == ("latency", "memory", "balanced")


def test_goal_labels_cover_all_goals() -> None:
    assert set(GOAL_LABELS.keys()) == set(GOALS)
    for goal in GOALS:
        assert isinstance(GOAL_LABELS[goal], str)
        assert GOAL_LABELS[goal].strip() != ""
