from __future__ import annotations

import concurrent.futures
from typing import Any

from .contracts import GoalType, PerformanceEstimate
from .estimator import estimate_performance
from .logging_utils import get_logger
from .optimizer import optimize_model
from .validation import validate_goal


logger = get_logger("sysaware.autotuner")


def _candidate_score(result: PerformanceEstimate, goal: GoalType, metadata: dict[str, Any]) -> float:
	low, high = result["latency_range_ms"]
	memory = float(result["memory_mb"])
	
	# Accuracy penalty: Lower parity score increases the final 'cost' score
	accuracy_parity = 1.0
	parity_info = metadata.get("accuracy_parity")
	if parity_info and isinstance(parity_info, dict):
		accuracy_parity = parity_info.get("parity_score", 1.0)
	
	# We want to minimize the score, so we divide by accuracy parity
	# If parity is 0.5 (50% loss), the score doubles (making it less attractive)
	penalty_multiplier = 1.0 / max(0.1, accuracy_parity)

	if goal == "latency":
		return float(high) * penalty_multiplier
	if goal == "memory":
		return memory * penalty_multiplier
	return (float(high) * 0.7 + memory * 0.3) * penalty_multiplier


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

	# 1. Evaluate baseline immediately (fast)
	baseline_model, baseline_metadata, baseline_result = _baseline_candidate(model, profile)
	
	candidates_results = [
		{
			"name": "baseline",
			"mode": "none",
			"model": baseline_model,
			"metadata": baseline_metadata,
			"result": baseline_result,
		}
	]

	# 2. Evaluate specialized candidates in parallel
	# Note: We use threads because quantization/casting is mostly CPU-bound preparation
	# and releasing the GIL often happens in torch/native code.
	modes = ["int8", "fp16"]
	with concurrent.futures.ThreadPoolExecutor(max_workers=len(modes)) as executor:
		future_to_mode = {executor.submit(_evaluate_candidate, model, profile, mode): mode for mode in modes}
		for future in concurrent.futures.as_completed(future_to_mode):
			mode = future_to_mode[future]
			try:
				c_model, c_metadata, c_result = future.result()
				candidates_results.append({
					"name": mode,
					"mode": mode,
					"model": c_model,
					"metadata": c_metadata,
					"result": c_result,
				})
			except Exception as exc:
				logger.error("Candidate %s failed during autotuning: %s", mode, exc)

	scored_candidates = []
	for candidate in candidates_results:
		score = _candidate_score(candidate["result"], goal_v, candidate["metadata"])
		scored_candidates.append((score, candidate))
		logger.info("Candidate %s scored %.4f for goal=%s", candidate["name"], score, goal_v)

	if not scored_candidates:
		raise RuntimeError("Autotuning failed to evaluate any candidates")

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
