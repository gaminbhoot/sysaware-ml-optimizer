from __future__ import annotations

import statistics
import time
import tracemalloc
from typing import Any

from .contracts import PerformanceEstimate
from .logging_utils import get_logger
from .benchmark import run_llm_benchmark
def _dtype_size_bytes(dtype: Any) -> int:
	try:
		import torch
		if dtype is not None:
			return int(torch.tensor([], dtype=dtype).element_size())
	except Exception:
		pass
	return 4


def _estimate_static_memory_mb(model: Any) -> float:

	total_params = 0
	dtype_size = 4

	if hasattr(model, "parameters"):
		try:
			params = list(model.parameters())
		except Exception:
			params = []

		for parameter in params:
			try:
				total_params += int(parameter.numel())
				dtype_size = _dtype_size_bytes(getattr(parameter, "dtype", None)) or dtype_size
			except Exception:
				continue

	elif isinstance(model, dict):
		for value in model.values():
			if hasattr(value, "numel"):
				try:
					total_params += int(value.numel())
					dtype_size = _dtype_size_bytes(getattr(value, "dtype", None)) or dtype_size
				except Exception:
					continue

	elif isinstance(model, (list, tuple)):
		for value in model:
			if hasattr(value, "numel"):
				try:
					total_params += int(value.numel())
					dtype_size = _dtype_size_bytes(getattr(value, "dtype", None)) or dtype_size
				except Exception:
					continue

	return (total_params * dtype_size) / (1024 ** 2)


def _get_batch_size(profile: dict[str, Any]) -> int:
	if profile.get("gpu_available") and float(profile.get("gpu_vram_gb", 0.0)) >= 8.0:
		return 8
	if float(profile.get("ram_gb", 0.0)) >= 16.0:
		return 4
	return 1


def _get_model_input_shape(model: Any) -> tuple[int, ...]:
	"""
	Heuristically determines the expected input shape for a torch model.
	Defaults to (1, 16) if detection fails.
	"""
	try:
		import torch
	except ImportError:
		return (1, 16)

	try:
		# Check for common layer types to infer input size
		for module in model.modules():
			if isinstance(module, torch.nn.Linear):
				return (1, int(module.in_features))
			if isinstance(module, (torch.nn.Conv1d, torch.nn.Conv2d, torch.nn.Conv3d)):
				# Return batch=1, then the correct number of channels
				return (1, int(module.in_channels), 224, 224) if isinstance(module, torch.nn.Conv2d) else (1, int(module.in_channels), 224)
	except Exception:
		pass
	
	# Fallback for LLMs (often use hidden_size 768, 1024, 4096)
	# Many transformers models have a 'config' with hidden_size
	if hasattr(model, "config"):
		hidden = getattr(model.config, "hidden_size", 768)
		return (1, 1, int(hidden)) # (Batch, Seq, Hidden)
		
	return (1, 16)


def _build_dummy_input(model: Any, batch_size: int) -> Any:
	try:
		import torch
	except ImportError:
		return None
	
	shape = list(_get_model_input_shape(model))
	shape[0] = batch_size # Override batch size based on hardware profile
	
	try:
		# Create zeros of the detected shape
		return torch.zeros(*shape)
	except Exception:
		return torch.zeros(batch_size, 16)


def _run_micro_benchmark(model: Any, profile: dict[str, Any]) -> tuple[tuple[float, float], float, str]:
	try:
		import torch
	except ImportError:
		raise RuntimeError("Torch is required for micro-benchmarking")

	if not hasattr(model, "eval") or not callable(getattr(model, "eval")):
		raise RuntimeError("Model does not support evaluation mode")

	device_name = "cpu"
	if profile.get("gpu_available"):
		if hasattr(torch, "cuda") and torch.cuda.is_available():
			device_name = "cuda"
		elif hasattr(getattr(torch, "backends", None), "mps") and getattr(torch.backends, "mps").is_available():
			device_name = "mps"

	# MPS does not support mixed-dtype matmul (FP32 input vs FP16 model).
	# Fall back to CPU for FP16 models on Apple Silicon to avoid a fatal assertion.
	if device_name == "mps":
		try:
			first_param = next(model.parameters())
			if first_param.dtype == torch.float16:
				device_name = "cpu"
		except StopIteration:
			pass

	device = torch.device(device_name)

	input_tensor = _build_dummy_input(model, _get_batch_size(profile))
	if input_tensor is None:
		raise RuntimeError("Unable to build dummy input")

	model.eval()
	try:
		if hasattr(model, "to"):
			model = model.to(device)
	except Exception:
		pass
	try:
		if hasattr(input_tensor, "to"):
			input_tensor = input_tensor.to(device)
	except Exception:
		pass

	durations: list[float] = []
	is_cuda = (device.type == "cuda")
	peak_tracemalloc_bytes_val = 0.0

	if is_cuda:
		try: torch.cuda.reset_peak_memory_stats(device)
		except Exception: pass
	elif device.type == "cpu":
		if not tracemalloc.is_tracing():
			tracemalloc.start()

	with torch.no_grad():
		# Warmup
		warmup_start = time.perf_counter()
		while time.perf_counter() - warmup_start < 0.1:
			model(input_tensor)

		# Dynamic Benchmark Loop
		start_benchmark = time.perf_counter()
		max_duration = 1.0  # 1.0 second fixed duration threshold
		
		while True:
			if is_cuda:
				try: torch.cuda.synchronize(device)
				except Exception: pass
				
			start = time.perf_counter()
			model(input_tensor)
			
			if is_cuda:
				try: torch.cuda.synchronize(device)
				except Exception: pass
				
			durations.append((time.perf_counter() - start) * 1000.0)

			if time.perf_counter() - start_benchmark >= max_duration:
				break
				
			if len(durations) >= 5:
				last_3 = durations[-3:]
				mean_val = statistics.mean(last_3)
				if mean_val > 0:
					variance_pct = (max(last_3) - min(last_3)) / mean_val
					if variance_pct < 0.05:  # variance stabilized under 5% over last 3 epochs
						break

	if device.type == "cpu" and tracemalloc.is_tracing():
		_, peak_tracemalloc = tracemalloc.get_traced_memory()
		tracemalloc.stop()
		peak_tracemalloc_bytes_val = float(peak_tracemalloc)

	if not durations:
		raise RuntimeError("No benchmark timings collected")

	latency_low = min(durations)
	latency_high = max(durations)

	if is_cuda:
		try:
			peak_bytes = float(torch.cuda.max_memory_allocated(device))
			memory_mb = peak_bytes / (1024 ** 2)
		except Exception:
			memory_mb = _estimate_static_memory_mb(model)
	else:
		memory_mb = _estimate_static_memory_mb(model) + (peak_tracemalloc_bytes_val / (1024 ** 2))

	confidence = "high" if len(durations) >= 5 else "medium"
	return (latency_low, latency_high), memory_mb, confidence

import joblib
import os
import pandas as pd

def predict_inference_speed(hardware_specs: dict, model_metadata: dict) -> dict:
    """Predicts tok/s using trained regression models."""
    # Load models and metadata on demand
    try:
        estimator_invram = joblib.load("data/estimator_invram.joblib")
        estimator_metadata = joblib.load("data/estimator_metadata.joblib")
        # Try to load spill model if it exists
        estimator_spill = None
        if os.path.exists("data/estimator_ramspill.joblib"):
            estimator_spill = joblib.load("data/estimator_ramspill.joblib")
    except:
        return {"error": "Estimator model not loaded", "predicted_tok_s": 0.0}

    # Feature engineering
    mem_bw = hardware_specs.get("memory_bandwidth_gbps", 100.0)
    vram = hardware_specs.get("vram_gb", 8.0)
    params = model_metadata.get("params_b", 7.0)
    bits = model_metadata.get("quant_bits", 4.0)
    model_size = (params * bits) / 8
    
    # Platform detection
    gpu_name = hardware_specs.get("gpu_name", "").upper()
    is_apple = 1 if any(x in gpu_name for x in ["M1", "M2", "M3", "M4", "APPLE", "SILICON"]) else 0

    is_spill = 1 if model_size > (vram * 0.8) else 0

    features = ['memory_bandwidth_gbps', 'vram_gb', 'model_size_gb', 'quant_bits', 'is_apple']
    input_data = pd.DataFrame([[mem_bw, vram, model_size, bits, is_apple]], columns=features)

    if is_spill and estimator_spill:
        prediction = float(estimator_spill.predict(input_data)[0])
        mae = estimator_metadata["maes"].get("spill", 5.0)
        method = "randomforest-ramspill"
    elif is_spill:
        # Fallback for spill if no model trained
        prediction = 2.0
        mae = 1.0
        method = "spill-fallback"
    else:
        prediction = float(estimator_invram.predict(input_data)[0])
        mae = estimator_metadata["maes"]["invram"]
        method = "randomforest-invram"

    return {
        "predicted_tok_s": prediction,
        "confidence_interval": [max(0, prediction - mae), prediction + mae],
        "method": method,
        "is_apple": bool(is_apple),
        "is_ram_spill": bool(is_spill)
    }

def estimate_performance(model: Any, profile: dict[str, Any]) -> PerformanceEstimate:
	try:
		from transformers import PreTrainedModel
	except ImportError:
		PreTrainedModel = None

	if model is None:
		raise ValueError("Model cannot be None")
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	# Logic for LLM detection
	is_llm = (PreTrainedModel is not None and isinstance(model, PreTrainedModel))

	static_memory_mb = _estimate_static_memory_mb(model)
	latency_range = (0.0, 0.0)
	memory_mb = static_memory_mb
	confidence = "low"
	method = "static"
	
	llm_metrics = {}

	try:
		if is_llm:
			logger.info("LLM detected. Running real-world inference benchmark (tokens/sec).")
			llm_metrics, benchmark_memory_mb, benchmark_confidence = run_llm_benchmark(model, profile)
			# Map LLM metrics to contract
			latency_range = (llm_metrics["prefill_latency_ms"], llm_metrics["prefill_latency_ms"])
			memory_mb = max(static_memory_mb, benchmark_memory_mb)
			confidence = benchmark_confidence
			method = "real-world-llm-benchmark"
		else:
			latency_range, benchmark_memory_mb, benchmark_confidence = _run_micro_benchmark(model, profile)
			memory_mb = max(static_memory_mb, benchmark_memory_mb)
			confidence = benchmark_confidence
			method = "static+micro-benchmark"
	except Exception as exc:
		logger.warning("Benchmarking failed, using static estimate only: %s", exc)
		if static_memory_mb > 0:
			latency_range = (0.0, max(0.1, static_memory_mb * 10.0))

	if latency_range == (0.0, 0.0):
		latency_range = (0.0, max(0.1, static_memory_mb * 10.0))

	estimate: PerformanceEstimate = {
		"latency_range_ms": (float(latency_range[0]), float(latency_range[1])),
		"memory_mb": float(memory_mb),
		"confidence": confidence,
		"method": method,
	}
	
	# Plumb through LLM metrics if available
	if is_llm and llm_metrics:
		estimate["decode_tokens_per_sec"] = float(llm_metrics.get("decode_tokens_per_sec", 0.0))
		estimate["prefill_latency_ms"] = float(llm_metrics.get("prefill_latency_ms", 0.0))
		estimate["wall_clock_ms"] = float(llm_metrics.get("wall_clock_ms", 0.0))

	return estimate
