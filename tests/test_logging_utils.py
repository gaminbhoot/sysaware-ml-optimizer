import logging

from core.logging_utils import get_logger


def test_get_logger_reuses_same_logger_instance() -> None:
    first = get_logger("sysaware.test.logger")
    second = get_logger("sysaware.test.logger")
    assert first is second


def test_get_logger_does_not_duplicate_handlers_on_repeated_calls() -> None:
    logger_name = "sysaware.test.handlers"
    logger = get_logger(logger_name)
    initial_handlers = len(logger.handlers)

    for _ in range(5):
        get_logger(logger_name)

    assert len(logger.handlers) == initial_handlers
    assert len(logger.handlers) >= 1


def test_get_logger_respects_requested_level() -> None:
    logger = get_logger("sysaware.test.level", level=logging.DEBUG)
    assert logger.level == logging.DEBUG
