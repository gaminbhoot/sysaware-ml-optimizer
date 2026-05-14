from typing import Any, Dict, Optional
from .contracts import SystemProfile

VIRTUAL_HARDWARE = {
    "NVIDIA_A100_80GB": {
        "name": "NVIDIA A100 (80GB)",
        "tflops_fp16": 312.0,
        "bandwidth_gb_s": 1935.0,
        "vram_gb": 80.0
    },
    "NVIDIA_H100_80GB": {
        "name": "NVIDIA H100 (80GB)",
        "tflops_fp16": 989.0,
        "bandwidth_gb_s": 3350.0,
        "vram_gb": 80.0
    },
    "NVIDIA_RTX_4090": {
        "name": "NVIDIA RTX 4090",
        "tflops_fp16": 82.5,
        "bandwidth_gb_s": 1008.0,
        "vram_gb": 24.0
    },
    "RASPBERRY_PI_5": {
        "name": "Raspberry Pi 5 (8GB)",
        "tflops_fp16": 0.05,
        "bandwidth_gb_s": 12.8,
        "vram_gb": 8.0
    },
    "APPLE_M3_MAX": {
        "name": "Apple M3 Max (128GB)",
        "tflops_fp16": 14.2,
        "bandwidth_gb_s": 400.0,
        "vram_gb": 128.0
    }
}

def simulate_performance(report: Dict[str, Any], target_key: str) -> Optional[Dict[str, Any]]:
    if target_key not in VIRTUAL_HARDWARE:
        return None
    
    target = VIRTUAL_HARDWARE[target_key]
    current = report["system_profile"]
    
    # Calculate Ratios (Target / Current)
    # Ensure no division by zero
    tflops_ratio = target["tflops_fp16"] / max(0.1, current.get("tflops_fp16", 1.0))
    bandwidth_ratio = target["bandwidth_gb_s"] / max(1.0, current.get("bandwidth_gb_s", 32.0))
    
    # Performance Simulation Logic
    # 1. Memory Guard
    model_size_mb = report["model_analysis"].get("size_mb", 0.0)
    best_result = report["best_result"]
    peak_mem_mb = best_result.get("memory_mb", model_size_mb)
    
    is_oom = (peak_mem_mb > (target["vram_gb"] * 1024 * 0.9)) # 90% utilization threshold
    
    # 2. Scaling Latency
    # Prefill/Static benchmarks are usually compute-bound (TFLOPS)
    # Decoding/LLM benchmarks are often bandwidth-bound
    
    def scale_latency(lat_range):
        if not lat_range: return lat_range
        # Use a blended ratio: 40% compute, 60% bandwidth for general LLM work
        blend_ratio = (tflops_ratio * 0.4) + (bandwidth_ratio * 0.6)
        # Latency is inverse to power
        return (lat_range[0] / blend_ratio, lat_range[1] / blend_ratio)

    sim_latency = scale_latency(best_result.get("latency_range_ms"))
    sim_ttft = best_result.get("prefill_latency_ms", 0.0) / tflops_ratio if "prefill_latency_ms" in best_result else None
    sim_tps = best_result.get("decode_tokens_per_sec", 0.0) * bandwidth_ratio if "decode_tokens_per_sec" in best_result else None

    return {
        "target_hardware": target["name"],
        "is_oom_predicted": is_oom,
        "simulated_latency_range_ms": sim_latency,
        "simulated_ttft_ms": sim_ttft,
        "simulated_tokens_per_sec": sim_tps,
        "ratios": {
            "compute_gain": tflops_ratio,
            "bandwidth_gain": bandwidth_ratio
        }
    }
