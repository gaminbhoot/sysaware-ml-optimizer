from __future__ import annotations

import copy
from typing import Any

from .logging_utils import get_logger

try:
	import torch  # type: ignore
except Exception:  # pragma: no cover
	torch = None  # type: ignore


logger = get_logger("sysaware.optimizer")

SUPPORTED_MODES = {"int8", "fp16", "none"}


def _clone_model(model: Any) -> Any:
	try:
		return copy.deepcopy(model)
	except Exception:
		return model


def _base_metadata(method: str, device: str, applied: bool, skipped_reasons: list[str] | None = None) -> dict[str, Any]:
	return {
		"method": method,
		"device": device,
		"applied": applied,
		"skipped_reasons": skipped_reasons or [],
	}


def no_op_optimization(model: Any, reason: str = "No optimization requested") -> tuple[Any, dict[str, Any]]:
	return model, _base_metadata("none", "unchanged", False, [reason])


def apply_int8_quantization(model: Any) -> tuple[Any, dict[str, Any]]:
	if model is None:
		raise ValueError("Model cannot be None")

	if torch is None or not hasattr(torch, "quantization"):
		return model, _base_metadata("int8", "cpu", False, ["Torch quantization is unavailable"])

	quantize_dynamic = getattr(torch.quantization, "quantize_dynamic", None)
	linear_layer = getattr(getattr(torch, "nn", None), "Linear", None)
	qint8 = getattr(torch, "qint8", None)

	if quantize_dynamic is None or linear_layer is None or qint8 is None:
		return model, _base_metadata("int8", "cpu", False, ["Torch quantization prerequisites are unavailable"])

	target = _clone_model(model)
	try:
		optimized = quantize_dynamic(target, {linear_layer}, dtype=qint8)
		return optimized, _base_metadata("int8", "cpu", True, [])
	except Exception as exc:
		logger.warning("INT8 quantization failed: %s", exc)
		return model, _base_metadata("int8", "cpu", False, [str(exc)])


def convert_to_fp16(model: Any, profile: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
	if model is None:
		raise ValueError("Model cannot be None")
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	if not profile.get("gpu_available"):
		return model, _base_metadata("fp16", "cpu", False, ["GPU is not available in the system profile"])

	if torch is None or not hasattr(torch, "cuda") or not callable(getattr(torch.cuda, "is_available", None)):
		return model, _base_metadata("fp16", "cpu", False, ["CUDA is unavailable in the current environment"])

	if not torch.cuda.is_available():
		return model, _base_metadata("fp16", "cpu", False, ["CUDA is not available in torch"])

	target = _clone_model(model)
	try:
		if hasattr(target, "to"):
			target = target.to("cuda")
		if hasattr(target, "half"):
			target = target.half()
		return target, _base_metadata("fp16", "cuda", True, [])
	except Exception as exc:
		logger.warning("FP16 conversion failed: %s", exc)
		return model, _base_metadata("fp16", "cuda", False, [str(exc)])


def optimize_model(model: Any, profile: dict[str, Any], mode: str = "int8") -> tuple[Any, dict[str, Any]]:
	if model is None:
		raise ValueError("Model cannot be None")
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	normalized_mode = mode.lower().strip()
	if normalized_mode not in SUPPORTED_MODES:
		raise ValueError(f"Unsupported optimization mode '{mode}'. Supported modes: {sorted(SUPPORTED_MODES)}")

	if normalized_mode == "none":
		return no_op_optimization(model)
	if normalized_mode == "fp16":
		return convert_to_fp16(model, profile)
	return apply_int8_quantization(model)
