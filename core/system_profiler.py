import os
import platform
from typing import Any

from .contracts import SystemProfile
from .logging_utils import get_logger

try:
	import psutil  # type: ignore
except Exception:  # pragma: no cover
	psutil = None  # type: ignore

try:
	import torch  # type: ignore
except Exception:  # pragma: no cover
	torch = None  # type: ignore


logger = get_logger("sysaware.system_profiler")


def _bytes_to_gb(value: float) -> float:
	return round(value / (1024 ** 3), 2)


def get_system_profile() -> SystemProfile:
	profile: SystemProfile = {
		"os": "Unknown",
		"cpu_cores": 1,
		"ram_gb": 0.0,
		"gpu_available": False,
		"gpu_name": "None",
		"gpu_vram_gb": 0.0,
	}

	try:
		os_name = platform.system().strip() or "Unknown"
		os_release = platform.release().strip()
		profile["os"] = f"{os_name} {os_release}".strip()
	except Exception as exc:
		logger.warning("OS detection failed: %s", exc)

	try:
		cores = None
		if psutil is not None:
			cores = psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True)
		if not cores:
			cores = os.cpu_count() or 1
		profile["cpu_cores"] = max(int(cores), 1)
	except Exception as exc:
		logger.warning("CPU detection failed: %s", exc)

	try:
		if psutil is not None:
			vm = psutil.virtual_memory()
			total_bytes = float(getattr(vm, "total", 0.0))
			available_bytes = float(getattr(vm, "available", 0.0))
			profile["ram_gb"] = max(_bytes_to_gb(total_bytes), 0.0)
			profile["ram_available_gb"] = max(_bytes_to_gb(available_bytes), 0.0)
		else:
			profile["ram_available_gb"] = profile["ram_gb"]
	except Exception as exc:
		logger.warning("RAM detection failed: %s", exc)

	try:
		cuda: Any = getattr(torch, "cuda", None) if torch is not None else None
		mps: Any = getattr(getattr(torch, "backends", None), "mps", None) if torch is not None else None

		if cuda is not None and bool(cuda.is_available()):
			device_idx = 0
			try:
				if hasattr(cuda, "current_device"):
					device_idx = int(cuda.current_device())
			except Exception:
				device_idx = 0

			props = cuda.get_device_properties(device_idx)
			profile["gpu_available"] = True
			profile["gpu_name"] = getattr(props, "name", "Unknown GPU") or "Unknown GPU"
			profile["gpu_vram_gb"] = max(_bytes_to_gb(float(getattr(props, "total_memory", 0.0))), 0.0)
			
		elif mps is not None and bool(mps.is_available()):
			profile["gpu_available"] = True
			profile["gpu_name"] = "Apple Silicon MPS"
			# Apple Silicon uses unified memory; safely report the available system RAM as VRAM
			profile["gpu_vram_gb"] = profile.get("ram_available_gb", profile["ram_gb"])

	except Exception as exc:
		logger.warning("GPU detection failed: %s", exc)

	return profile
