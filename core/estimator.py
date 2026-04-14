from __future__ import annotations

import statistics
import time
import tracemalloc
from typing import Any

from .contracts import PerformanceEstimate
from .logging_utils import get_logger

try:
	import torch  # type: ignore
except Exception:  # pragma: no cover
	torch = None  # type: ignore


logger = get_logger("sysaware.estimator")


def _dtype_size_bytes(dtype: Any) -> int:
	if torch is not None and dtype is not None:
		try:
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


def _build_dummy_input(batch_size: int) -> Any:
	if torch is None:
		return None
	return torch.zeros(batch_size, 16)


def _run_micro_benchmark(model: Any, profile: dict[str, Any]) -> tuple[tuple[float, float], float, str]:
	if torch is None:
		raise RuntimeError("Torch is required for micro-benchmarking")

	if not hasattr(model, "eval") or not callable(getattr(model, "eval")):
		raise RuntimeError("Model does not support evaluation mode")

	device_name = "cpu"
	if profile.get("gpu_available"):
		if hasattr(torch, "cuda") and torch.cuda.is_available():
			device_name = "cuda"
		elif hasattr(getattr(torch, "backends", None), "mps") and getattr(torch.backends, "mps").is_available():
			device_name = "mps"
	device = torch.device(device_name)

	input_tensor = _build_dummy_input(_get_batch_size(profile))
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


def estimate_performance(model: Any, profile: dict[str, Any]) -> PerformanceEstimate:
	if model is None:
		raise ValueError("Model cannot be None")
	if not isinstance(profile, dict):
		raise ValueError("Profile must be a dictionary")

	static_memory_mb = _estimate_static_memory_mb(model)
	latency_range = (0.0, 0.0)
	memory_mb = static_memory_mb
	confidence = "low"
	method = "static"

	try:
		latency_range, benchmark_memory_mb, benchmark_confidence = _run_micro_benchmark(model, profile)
		memory_mb = max(static_memory_mb, benchmark_memory_mb)
		confidence = benchmark_confidence
		method = "static+micro-benchmark"
	except Exception as exc:
		logger.warning("Micro-benchmark failed, using static estimate only: %s", exc)
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
	return estimate
