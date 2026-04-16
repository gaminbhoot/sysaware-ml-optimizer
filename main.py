import argparse
import json
import sys
from pathlib import Path
from typing import Any

from core.contracts import GOALS
from core.estimator import estimate_performance
from core.logging_utils import get_logger
from core.model_analyzer import analyze_model
from core.optimizer import optimize_model
from core.prompt_optimizer import optimize_prompt
from core.strategy_engine import get_strategy
from core.system_profiler import get_system_profile
from core.autotuner import autotune
from core.validation import ValidationError, set_global_seed, validate_goal


logger = get_logger("sysaware.cli")


def parse_args(argv: list[str]) -> argparse.Namespace:
	parser = argparse.ArgumentParser(
		description="SysAware ML Optimizer CLI",
	)
	parser.add_argument(
		"--model-path",
		required=True,
		help="Path to a local .pt or .pth model file",
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
		"--json",
		action="store_true",
		help="Print the result as JSON instead of a human-readable summary",
	)
	parser.add_argument(
		"--optimize-prompt",
		action="store_true",
		help="Enable the optional prompt optimizer",
	)
	parser.add_argument(
		"--prompt-text",
		default="",
		help="Prompt text to optimize when --optimize-prompt is enabled",
	)
	parser.add_argument(
		"--prompt-type",
		default="general",
		choices=["general", "coding", "analysis", "creative"],
		help="Prompt intent used by the optional prompt optimizer",
	)
	parser.add_argument(
		"--unsafe-load",
		action="store_true",
		help="Allow arbitrary code execution by bypassing weights_only during model load",
	)
	return parser.parse_args(argv)


def load_model_from_path(model_path: str, unsafe_load: bool = False) -> Any:
	path = Path(model_path)
	if not path.exists():
		raise FileNotFoundError(f"Model file not found: {model_path}")

	try:
		import torch
	except Exception as exc:  # pragma: no cover - import failure is environment-specific
		raise RuntimeError("Torch is required to load model files") from exc

	try:
		return torch.load(str(path), map_location="cpu", weights_only=not unsafe_load)
	except Exception as exc:
		if unsafe_load:
			raise RuntimeError(f"Failed to load model '{model_path}' with unsafe_load enabled: {exc}") from exc
		raise RuntimeError(
			f"Failed to load model '{model_path}' with weights_only=True: {exc}. "
			"If this is a full-module checkpoint, retry with --unsafe-load or use the GUI unsafe-load option. "
			"If it is a state_dict, the checkpoint can still be analyzed, but optimization requires a torch.nn.Module."
		) from exc


def build_report(
	model_path: str,
	goal: str,
	system_profile: dict[str, Any],
	model_analysis: dict[str, Any],
	baseline: dict[str, Any],
	strategy: dict[str, Any],
	best_config: dict[str, Any],
	best_result: dict[str, Any],
	prompt_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
	return {
		"model_path": model_path,
		"goal": goal,
		"system_profile": system_profile,
		"model_analysis": model_analysis,
		"baseline": baseline,
		"strategy": strategy,
		"best_config": best_config,
		"best_result": best_result,
		"prompt_optimizer": prompt_result,
	}


def print_human_report(report: dict[str, Any]) -> None:
	system = report["system_profile"]
	model = report["model_analysis"]
	baseline = report["baseline"]
	best_result = report["best_result"]
	best_config = report["best_config"]
	strategy = report["strategy"]

	print(f"System: {system.get('cpu_cores', '—')} CPU cores | {system.get('ram_gb', 0):.1f} GB RAM | {system.get('os', 'Unknown')}")
	dgpu_name = system.get('dgpu_name', 'None')
	igpu_name = system.get('igpu_name', 'None')
	npu_name  = system.get('npu_name', 'None')
	print(f"  dGPU: {dgpu_name} ({system.get('dgpu_vram_gb', 0.0):.2f} GB) | iGPU: {igpu_name} ({system.get('igpu_vram_gb', 0.0):.2f} GB) | NPU: {npu_name}")
	print(f"Model: {model.get('model_name', 'Unknown')} | {model.get('num_params', 0):,} params | {model.get('size_mb', 0.0):.2f} MB")
	print("\nBefore:")
	print(f"  Latency : {baseline.get('latency_range_ms', (0.0, 0.0))[0]:.2f}ms – {baseline.get('latency_range_ms', (0.0, 0.0))[1]:.2f}ms")
	print(f"  Memory  : {baseline.get('memory_mb', 0.0):.2f}MB")
	print("\nAfter:")
	print(f"  Latency : {best_result.get('latency_range_ms', (0.0, 0.0))[0]:.2f}ms – {best_result.get('latency_range_ms', (0.0, 0.0))[1]:.2f}ms")
	print(f"  Memory  : {best_result.get('memory_mb', 0.0):.2f}MB")
	print(f"  Config  : {best_config.get('name', 'unknown')} ({best_config.get('mode', 'unknown')})")
	print(f"\nRecommendation: {strategy.get('recommendation', 'No recommendation available.')}")
	if report.get("prompt_optimizer"):
		prompt_result = report["prompt_optimizer"]
		print("\nPrompt Optimizer:")
		print(f"  Before Score : {prompt_result.get('before_score', 0)} / 100")
		print(f"  After Score  : {prompt_result.get('after_score', 0)} / 100")
		print("  Suggestions  :")
		for suggestion in prompt_result.get("suggestions", []):
			print(f"    - {suggestion}")


def run_pipeline(args: argparse.Namespace) -> dict[str, Any]:
	goal = validate_goal(args.goal)
	set_global_seed(args.seed)

	system_profile = get_system_profile()
	model = load_model_from_path(args.model_path, args.unsafe_load)
	model_analysis = analyze_model(model)
	baseline = estimate_performance(model, system_profile)
	strategy = get_strategy(system_profile, goal, model_analysis)
	best_config, best_model, best_result = autotune(model, system_profile, goal)

	prompt_result = None
	if args.optimize_prompt:
		if not args.prompt_text.strip():
			raise ValueError("--prompt-text is required when --optimize-prompt is enabled")
		prompt_result = optimize_prompt(args.prompt_text, args.prompt_type)

	return build_report(
		model_path=args.model_path,
		goal=goal,
		system_profile=system_profile,
		model_analysis=model_analysis,
		baseline=baseline,
		strategy=strategy,
		best_config=best_config,
		best_result=best_result,
		prompt_result=prompt_result,
	)


def main(argv: list[str] | None = None) -> int:
	try:
		args = parse_args(argv or sys.argv[1:])
	except SystemExit as exc:
		return int(exc.code) if isinstance(exc.code, int) else 2

	try:
		report = run_pipeline(args)
	except (ValidationError, FileNotFoundError, RuntimeError, ValueError) as exc:
		logger.error(str(exc))
		if getattr(args, "json", False):
			print(json.dumps({"status": "error", "message": str(exc), "code": 500}))
		return 2

	if args.json:
		print(json.dumps(report, indent=2, default=str))
	else:
		print_human_report(report)

	return 0


if __name__ == "__main__":
	raise SystemExit(main())
