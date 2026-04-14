import argparse
import sys

from core.contracts import GOALS
from core.logging_utils import get_logger
from core.validation import ValidationError, validate_goal, set_global_seed


logger = get_logger("sysaware.cli")


def parse_args(argv: list[str]) -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="SysAware ML Optimizer (Phase 0 scaffold)",
	)
	parser.add_argument(
		"--goal",
		default="balanced",
		choices=GOALS,
		help="Optimization goal",
	)
	parser.add_argument(
		"--seed",
		type=int,
		default=42,
		help="Global seed for deterministic behavior where possible",
	)
	parser.add_argument(
		"--model-path",
		default="",
		help="Path to .pt/.pth model (used in later phases)",
	)
	return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
	try:
		args = parse_args(argv or sys.argv[1:])
	except SystemExit as exc:
		# argparse uses SystemExit for invalid args; convert to CLI-style return code.
		return int(exc.code) if isinstance(exc.code, int) else 2

	try:
		goal = validate_goal(args.goal)
	except ValidationError as exc:
		logger.error(str(exc))
		return 2

	set_global_seed(args.seed)

	logger.info("Phase 0 scaffold is active")
	logger.info("Goal: %s", goal)
	logger.info("Model path: %s", args.model_path or "(not provided)")
	logger.info("Pipeline modules will be implemented in upcoming phases")
	return 0


if __name__ == "__main__":
	raise SystemExit(main())
