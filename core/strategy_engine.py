from __future__ import annotations

from typing import Any

from .contracts import StrategyResult
from .logging_utils import get_logger
from .validation import validate_goal, require_fields, validate_non_negative_number
from .plugins import registry


logger = get_logger("sysaware.strategy_engine")


def _profile_context(profile: dict[str, Any], model_analysis: dict[str, Any] | None = None) -> dict[str, str]:
	gpu_available = bool(profile.get("gpu_available", False))
	gpu_vram_gb = float(profile.get("gpu_vram_gb", 0.0))
	ram_gb = float(profile.get("ram_gb", 0.0))

	# Fallback static estimation for old tests if model_analysis is not provided.
	model_size_gb = max(float(model_analysis.get("size_mb", 1024.0)) / 1024.0, 0.01) if model_analysis else 2.0

	# Dynamic tier calculation: (Available Memory / Estimated Model Size)
	if gpu_available:
		gpu_ratio = gpu_vram_gb / model_size_gb
		if gpu_ratio >= 4.0:
			gpu_tier = "strong_gpu"
		elif gpu_ratio >= 1.5:
			gpu_tier = "modest_gpu"
		else:
			gpu_tier = "limited_gpu"
	else:
		gpu_tier = "cpu_only"

	ram_ratio = ram_gb / model_size_gb
	if ram_ratio >= 4.0:
		ram_tier = "plenty"
	elif ram_ratio >= 1.5:
		ram_tier = "moderate"
	else:
		ram_tier = "constrained"

	return {"gpu_tier": gpu_tier, "ram_tier": ram_tier}


def _build_recommendation(goal: str, optimization: str, device: str, profile_note: str, efficiency_note: str) -> str:
	goal_label = {
		"latency": "low latency",
		"memory": "low memory",
		"balanced": "balanced",
	}[goal]
	return (
		f"Goal: {goal_label}. Use {optimization.upper()} on {device}. "
		f"{profile_note} {efficiency_note}"
	).strip()


def get_strategy(profile: dict[str, Any], goal: str, model_analysis: dict[str, Any] | None = None) -> StrategyResult:
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	goal_v = validate_goal(goal)
	require_fields(profile, ["cpu_cores", "ram_gb", "gpu_available", "gpu_name", "gpu_vram_gb"], "system profile")

	# Query registry for supported modes
	supported_plugins = registry.list_supported_modes()
	has_fp16 = "fp16" in supported_plugins
	has_int8 = "int8" in supported_plugins

	cpu_cores = int(validate_non_negative_number(profile["cpu_cores"], "cpu_cores"))
	ram_gb = float(validate_non_negative_number(profile["ram_gb"], "ram_gb"))
	gpu_available = bool(profile["gpu_available"])
	gpu_name = str(profile.get("gpu_name", "None"))
	gpu_vram_gb = float(validate_non_negative_number(profile["gpu_vram_gb"], "gpu_vram_gb"))
	gpu_backend = str(profile.get("gpu_backend", "cuda" if gpu_available else "cpu")).lower()
	supported_gpu_backend = gpu_backend in {"cuda", "mps"}
	device_name = gpu_backend if supported_gpu_backend else "cpu"

	context = _profile_context(profile, model_analysis)
	gpu_tier = context["gpu_tier"]
	ram_tier = context["ram_tier"]

	# Default fallback
	optimization = "int8" if has_int8 else "none"
	device = "cpu"
	profile_note = "A stable fallback path was selected."
	efficiency_note = ""

	if goal_v == "memory":
		optimization = "int8" if has_int8 else "none"
		device = "cpu"
		profile_note = "Memory pressure is the priority, so CPU INT8 quantization is the safest low-footprint path."
		efficiency_note = "This keeps VRAM usage minimal and is robust on CPU-only machines."
		if not has_int8:
			profile_note = "Memory is priority, but INT8 plugin is missing. No-op selected."
		if gpu_available and gpu_tier == "strong_gpu" and ram_tier == "plenty":
			profile_note = (
				f"{gpu_name} is available, but the memory goal favors minimizing footprint over throughput."
			)
	elif goal_v == "latency":
		if has_fp16 and gpu_available and supported_gpu_backend and gpu_tier in {"strong_gpu", "modest_gpu"} and ram_tier != "constrained":
			optimization = "fp16"
			device = device_name
			profile_note = f"{gpu_name} has enough VRAM for faster half-precision inference on {device_name.upper()}."
			efficiency_note = "FP16 should reduce latency without overcommitting memory on this machine."
		else:
			optimization = "int8" if has_int8 else "none"
			device = "cpu"
			profile_note = "The hardware profile does not justify a GPU-first latency path, so CPU INT8 is safer."
			efficiency_note = "This keeps the recommendation deterministic and broadly compatible."
			if not has_int8:
				profile_note = "GPU path rejected and INT8 plugin is missing. No-op selected."
	else:
		if has_fp16 and gpu_available and supported_gpu_backend and gpu_tier == "strong_gpu" and ram_tier != "constrained":
			optimization = "fp16"
			device = device_name
			profile_note = f"{gpu_name} provides enough headroom for a balanced GPU-accelerated path on {device_name.upper()}."
			efficiency_note = "FP16 offers a practical speed-up without pushing memory usage too hard."
		elif has_fp16 and gpu_available and supported_gpu_backend and gpu_tier == "modest_gpu" and ram_tier == "plenty":
			optimization = "fp16"
			device = device_name
			profile_note = f"{gpu_name} can handle a balanced GPU path with moderate VRAM headroom on {device_name.upper()}."
			efficiency_note = "The profile suggests the speed gain is worth the GPU cost."
		else:
			optimization = "int8" if has_int8 else "none"
			device = "cpu"
			profile_note = "A CPU INT8 path gives the most stable balance between memory usage and portability."
			efficiency_note = "It avoids assuming enough GPU headroom for half-precision execution."
			if not has_int8:
				profile_note = "Balanced path defaults to No-Op as INT8 plugin is missing."

	recommendation = _build_recommendation(goal_v, optimization, device, profile_note, efficiency_note)
	rationale = (
		f"Profile tier={gpu_tier}/{ram_tier}; cpu_cores={cpu_cores}; ram_gb={ram_gb:.1f}; gpu_vram_gb={gpu_vram_gb:.1f}."
	)

	result: StrategyResult = {
		"optimization": optimization,
		"device": device,
		"rationale": rationale,
		"recommendation": recommendation,
	}
	logger.info("Strategy selected: %s on %s for goal=%s", optimization, device, goal_v)
	return result
