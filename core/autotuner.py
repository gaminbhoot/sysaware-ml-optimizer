from __future__ import annotations

from typing import Any

from .contracts import GoalType, PerformanceEstimate
from .estimator import estimate_performance
from .logging_utils import get_logger
from .optimizer import optimize_model
from .validation import validate_goal


logger = get_logger("sysaware.autotuner")


def _candidate_score(result: PerformanceEstimate, goal: GoalType) -> float:
	low, high = result["latency_range_ms"]
	memory = float(result["memory_mb"])

	if goal == "latency":
		return float(high)
	if goal == "memory":
		return memory
	return float(high) * 0.7 + memory * 0.3


def _baseline_candidate(model: Any, profile: dict[str, Any]) -> tuple[Any, dict[str, Any], PerformanceEstimate]:
	best_model = model
	best_metadata = {"method": "baseline", "device": "original", "applied": False, "skipped_reasons": ["baseline candidate"]}
	best_result = estimate_performance(model, profile)
	return best_model, best_metadata, best_result


def _evaluate_candidate(model: Any, profile: dict[str, Any], mode: str) -> tuple[Any, dict[str, Any], PerformanceEstimate]:
	optimized_model, metadata = optimize_model(model, profile, mode=mode)
	result = estimate_performance(optimized_model, profile)
	return optimized_model, metadata, result


def autotune(model: Any, profile: dict[str, Any], goal: str) -> tuple[dict[str, Any], Any, PerformanceEstimate]:
	if model is None:
		raise ValueError("Model cannot be None")
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	goal_v = validate_goal(goal)

	candidates: list[dict[str, Any]] = []

	baseline_model, baseline_metadata, baseline_result = _baseline_candidate(model, profile)
	candidates.append(
		{
			"name": "baseline",
			"mode": "none",
			"model": baseline_model,
			"metadata": baseline_metadata,
			"result": baseline_result,
		}
	)

	int8_model, int8_metadata, int8_result = _evaluate_candidate(model, profile, "int8")
	candidates.append(
		{
			"name": "int8",
			"mode": "int8",
			"model": int8_model,
			"metadata": int8_metadata,
			"result": int8_result,
		}
	)

	fp16_model, fp16_metadata, fp16_result = _evaluate_candidate(model, profile, "fp16")
	candidates.append(
		{
			"name": "fp16",
			"mode": "fp16",
			"model": fp16_model,
			"metadata": fp16_metadata,
			"result": fp16_result,
		}
	)

	scored_candidates = []
	for candidate in candidates[:3]:
		score = _candidate_score(candidate["result"], goal_v)
		scored_candidates.append((score, candidate))
		logger.info("Candidate %s scored %.4f for goal=%s", candidate["name"], score, goal_v)

	best_score, best_candidate = min(scored_candidates, key=lambda item: item[0])
	best_config = {
		"name": best_candidate["name"],
		"mode": best_candidate["mode"],
		"metadata": best_candidate["metadata"],
		"goal": goal_v,
		"score": best_score,
		"evaluated_candidates": len(scored_candidates),
	}
	return best_config, best_candidate["model"], best_candidate["result"]
