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


def _probe_apple_neural_engine() -> tuple[bool, str]:
	"""Return explicit ANE detection result on macOS.

	This intentionally avoids platform assumptions (for example, arm64 => ANE).
	A positive result is only returned when OS-level probes expose ANE signals.
	"""
	try:
		import subprocess

		# Prefer IORegistry signals because they expose device/driver entries.
		probes: list[tuple[str, str]] = [
			("ioreg -r -n AppleANE -l", "Apple Neural Engine"),
			("ioreg -l", "AppleANE"),
		]

		for cmd, name in probes:
			output = subprocess.check_output(cmd, shell=True, text=True, stderr=subprocess.DEVNULL)
			if "appleane" in output.lower() or "neural engine" in output.lower():
				return True, name
	except Exception:
		return False, "None"

	return False, "None"


def get_system_profile() -> SystemProfile:
	profile: SystemProfile = {
		"os": "Unknown",
		"cpu_cores": 1,
		"ram_gb": 0.0,
		"ram_available_gb": 0.0,
		"gpu_available": False,
		"gpu_backend": "cpu",
		"gpu_name": "None",
		"gpu_vram_gb": 0.0,
		"dgpu_name": "None",
		"dgpu_vram_gb": 0.0,
		"igpu_name": "None",
		"igpu_vram_gb": 0.0,
		"npu_available": False,
		"npu_name": "None",
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
			profile["gpu_backend"] = "cuda"
			profile["gpu_name"] = getattr(props, "name", "Unknown GPU") or "Unknown GPU"
			profile["gpu_vram_gb"] = max(_bytes_to_gb(float(getattr(props, "total_memory", 0.0))), 0.0)
			profile["dgpu_name"] = profile["gpu_name"]
			profile["dgpu_vram_gb"] = profile["gpu_vram_gb"]
			
		elif mps is not None and bool(mps.is_available()):
			profile["gpu_available"] = True
			profile["gpu_backend"] = "mps"
			profile["gpu_name"] = "Apple Silicon MPS"
			# Apple Silicon uses unified memory; safely report the available system RAM as VRAM
			profile["gpu_vram_gb"] = profile.get("ram_available_gb", profile["ram_gb"])
			profile["dgpu_name"] = profile["gpu_name"]
			profile["dgpu_vram_gb"] = profile["gpu_vram_gb"]

	except Exception as exc:
		logger.warning("GPU detection failed: %s", exc)

	if not profile.get("gpu_available"):
		try:
			import subprocess
			sys_os = platform.system()
			if sys_os == "Windows":
				output = subprocess.check_output("wmic path win32_VideoController get name", shell=True, text=True, stderr=subprocess.DEVNULL)
				for line in output.split("\n"):
					line = line.strip()
					if line and line.lower() != "name" and "virtual" not in line.lower() and "basic" not in line.lower():
						profile["gpu_available"] = True
						profile["gpu_backend"] = "generic"
						profile["gpu_name"] = line
						profile["gpu_vram_gb"] = profile.get("ram_available_gb", profile["ram_gb"]) / 2.0
						profile["igpu_name"] = profile["gpu_name"]
						profile["igpu_vram_gb"] = profile["gpu_vram_gb"]
						break
			elif sys_os == "Linux":
				output = subprocess.check_output("lspci | grep -i vga", shell=True, text=True, stderr=subprocess.DEVNULL)
				for line in output.split("\n"):
					if line:
						parts = line.split(": ")
						if len(parts) > 1:
							name = parts[1].split("(rev")[0].strip()
							if "virtual" not in name.lower() and "vmware" not in name.lower():
								profile["gpu_available"] = True
								profile["gpu_backend"] = "generic"
								profile["gpu_name"] = name
								profile["gpu_vram_gb"] = profile.get("ram_available_gb", profile["ram_gb"]) / 2.0
								profile["igpu_name"] = profile["gpu_name"]
								profile["igpu_vram_gb"] = profile["gpu_vram_gb"]
								break
		except Exception as exc:
			logger.warning("iGPU fallback detection failed: %s", exc)

	try:
		import subprocess
		import re
		sys_os = platform.system()
		if sys_os == "Windows":
			output = subprocess.check_output("wmic path Win32_PnPEntity get Name", shell=True, text=True, stderr=subprocess.DEVNULL)
			for line in output.split("\n"):
				line = line.strip()
				if line and (re.search(r'\bnpu\b', line.lower()) or "neural" in line.lower() or "ai accelerator" in line.lower()):
					profile["npu_available"] = True
					profile["npu_name"] = line
					break
		elif sys_os == "Linux":
			# check lspci for NPU or accelerators
			output = subprocess.check_output("lspci", shell=True, text=True, stderr=subprocess.DEVNULL)
			for line in output.split("\n"):
				if line and (re.search(r'\bnpu\b', line.lower()) or "neural" in line.lower() or "ai accelerator" in line.lower()):
					parts = line.split(": ")
					if len(parts) > 1:
						profile["npu_available"] = True
						profile["npu_name"] = parts[-1].strip()
						break
		elif sys_os == "Darwin":
			npu_available, npu_name = _probe_apple_neural_engine()
			profile["npu_available"] = npu_available
			profile["npu_name"] = npu_name
	except Exception as exc:
		logger.warning("NPU detection failed: %s", exc)

	return profile
