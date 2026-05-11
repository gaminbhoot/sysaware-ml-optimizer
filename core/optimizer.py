from __future__ import annotations

import tempfile
import os
from typing import Any, Dict, List, Tuple

from .logging_utils import get_logger
from .plugins import registry, OptimizationPlugin
from .evaluator import validator

try:
    import torch  # type: ignore
except Exception:  # pragma: no cover
    torch = None  # type: ignore


logger = get_logger("sysaware.optimizer")

def _clone_model(model: Any) -> Any:
    """Safely clones a model via disk serialization."""
    if model is None:
        return model

    if torch is not None and hasattr(torch, "save") and hasattr(torch, "load"):
        temp_path = None
        try:
            fd, temp_path = tempfile.mkstemp(suffix=".pt")
            os.close(fd)
            torch.save(model, temp_path)
            # Use weights_only=False for cloning as we trust our own temp file
            cloned = torch.load(temp_path, map_location="cpu", weights_only=False)
            return cloned
        except Exception as exc:
            logger.warning(f"Disk-based cloning failed: {exc}. Falling back to original model.")
            return model
        finally:
            if temp_path and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except Exception:
                    pass
    return model

def _base_metadata(method: str, device: str, applied: bool, skipped_reasons: list[str] | None = None) -> dict[str, Any]:
    return {
        "method": method,
        "device": device,
        "applied": applied,
        "skipped_reasons": skipped_reasons or [],
        "accuracy_parity": None # Will be filled after validation
    }

class Int8QuantizationPlugin:
    def apply(self, model: Any, profile: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
        if model is None:
            raise ValueError("Model cannot be None")

        if isinstance(model, (dict, list, tuple)):
            return model, _base_metadata("int8", "cpu", False, ["Direct optimization of state dictionaries or tensor collections is not supported. Please instantiate torch.nn.Module."])

        if torch is None or not hasattr(torch, "quantization"):
            return model, _base_metadata("int8", "cpu", False, ["Torch quantization unavailable"])

        quantize_dynamic = getattr(torch.quantization, "quantize_dynamic", None)
        qint8 = getattr(torch, "qint8", None)
        nn = getattr(torch, "nn", None)
        
        quantizable_modules = set()
        if nn is not None:
            for layer_name in ["Linear", "Conv1d", "Conv2d", "Conv3d", "LSTM", "GRU"]:
                layer = getattr(nn, layer_name, None)
                if layer is not None:
                    quantizable_modules.add(layer)

        if not quantizable_modules or quantize_dynamic is None or qint8 is None:
            return model, _base_metadata("int8", "cpu", False, ["Prerequisites unavailable"])

        target = _clone_model(model)
        try:
            optimized = quantize_dynamic(target, quantizable_modules, dtype=qint8)
            return optimized, _base_metadata("int8", "cpu", True, [])
        except Exception as exc:
            logger.warning(f"INT8 quantization failed: {exc}")
            return model, _base_metadata("int8", "cpu", False, [str(exc)])

class Fp16ConversionPlugin:
    def apply(self, model: Any, profile: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
        if model is None:
            raise ValueError("Model cannot be None")
        if not isinstance(profile, dict):
            raise ValueError("Profile must be a dictionary")

        if isinstance(model, (dict, list, tuple)):
            return model, _base_metadata("fp16", "cuda", False, ["Direct optimization of state dictionaries or tensor collections is not supported. Please instantiate torch.nn.Module."])

        if not profile.get("gpu_available"):
            return model, _base_metadata("fp16", "cpu", False, ["GPU not available"])

        if torch is None or not hasattr(torch, "cuda"):
            return model, _base_metadata("fp16", "cpu", False, ["Backends unavailable"])

        backend = str(profile.get("gpu_backend", "cuda")).lower()
        device_name = "cuda"
        if backend == "mps":
            mps = getattr(getattr(torch, "backends", None), "mps", None)
            if mps is None or not bool(mps.is_available()):
                return model, _base_metadata("fp16", "mps", False, ["MPS unavailable"])
            device_name = "mps"
        elif not torch.cuda.is_available():
            return model, _base_metadata("fp16", "cpu", False, ["CUDA unavailable"])

        target = _clone_model(model)
        try:
            if hasattr(target, "to"):
                target = target.to(device_name)
            if hasattr(target, "half"):
                target = target.half()
            return target, _base_metadata("fp16", device_name, True, [])
        except Exception as exc:
            logger.warning(f"FP16 conversion failed: {exc}")
            return model, _base_metadata("fp16", device_name, False, [str(exc)])

# Register default plugins
registry.register("int8", Int8QuantizationPlugin())
registry.register("fp16", Fp16ConversionPlugin())

# Backward Compatibility Aliases for Tests
SUPPORTED_MODES = {"int8", "fp16", "none"}

def no_op_optimization(model: Any, reason: str = "No optimization requested") -> tuple[Any, dict[str, Any]]:
    return model, _base_metadata("none", "unchanged", False, [reason])

def apply_int8_quantization(model: Any) -> tuple[Any, dict[str, Any]]:
    return Int8QuantizationPlugin().apply(model, {})

def convert_to_fp16(model: Any, profile: dict[str, Any]) -> tuple[Any, dict[str, Any]]:
    return Fp16ConversionPlugin().apply(model, profile)

def optimize_model(model: Any, profile: dict[str, Any], mode: str = "int8") -> tuple[Any, dict[str, Any]]:
    if model is None:
        raise ValueError("Model cannot be None")
    if not isinstance(profile, dict):
        raise ValueError("Profile must be a dictionary")
    
    normalized_mode = mode.lower().strip()
    
    if normalized_mode == "none":
        return model, _base_metadata("none", "unchanged", False, ["No optimization requested"])

    plugin = registry.get(normalized_mode)
    if not plugin:
        supported = registry.list_supported_modes() + ["none"]
        raise ValueError(f"Unsupported optimization mode '{mode}'. Supported: {supported}")

    optimized_model, metadata = plugin.apply(model, profile)
    
    # NEW: Accuracy Validation Layer
    if metadata.get("applied"):
        logger.info(f"Validating accuracy parity for mode: {normalized_mode}")
        parity_results = validator.validate_parity(model, optimized_model)
        metadata["accuracy_parity"] = parity_results
        
    return optimized_model, metadata
