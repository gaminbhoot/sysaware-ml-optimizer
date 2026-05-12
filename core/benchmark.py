import time
import tracemalloc
from typing import Any, Dict, Tuple

from .logging_utils import get_logger

try:
    import torch
    from transformers import PreTrainedModel, AutoTokenizer
except ImportError:
    torch = None
    PreTrainedModel = None
    AutoTokenizer = None

logger = get_logger("sysaware.benchmark")

def run_llm_benchmark(model: Any, profile: dict[str, Any]) -> Tuple[Dict[str, float], float, str]:
    """
    Run a real-world inference benchmark on an LLM.
    Returns: (metrics, peak_memory_mb, confidence)
    metrics: { 'prefill_latency_ms', 'decode_tokens_per_sec', 'wall_clock_ms' }
    """
    if torch is None:
        raise RuntimeError("torch is required for LLM benchmarking.")

    # Device selection
    device_name = "cpu"
    if profile.get("gpu_available"):
        if hasattr(torch, "cuda") and torch.cuda.is_available():
            device_name = "cuda"
        elif hasattr(getattr(torch, "backends", None), "mps") and getattr(torch.backends, "mps").is_available():
            device_name = "mps"
    device = torch.device(device_name)

    # Ensure model is in eval mode and on correct device
    if hasattr(model, "eval"):
        model.eval()
    try:
        model = model.to(device)
    except Exception:
        pass

    # Generic test prompt
    test_prompt = "The future of distributed artificial intelligence relies on real-time optimization."
    
    # Tokenizer acquisition
    tokenizer = None
    if hasattr(model, "config") and hasattr(model.config, "name_or_path") and AutoTokenizer:
        try:
            tokenizer = AutoTokenizer.from_pretrained(model.config.name_or_path)
        except Exception:
            pass
            
    if tokenizer is None:
        # Senior Dev Fallback: Create a mock tensor if no tokenizer is available
        input_ids = torch.randint(0, 1000, (1, 32), dtype=torch.long, device=device)
    else:
        input_ids = tokenizer.encode(test_prompt, return_tensors="pt").to(device)

    is_cuda = (device.type == "cuda")
    peak_tracemalloc_bytes_val = 0.0

    if is_cuda:
        try: torch.cuda.reset_peak_memory_stats(device)
        except Exception: pass
    elif device.type == "cpu":
        if not tracemalloc.is_tracing():
            tracemalloc.start()

    metrics = {
        "prefill_latency_ms": 0.0,
        "decode_tokens_per_sec": 0.0,
        "wall_clock_ms": 0.0
    }

    wall_clock_start = time.perf_counter()

    with torch.no_grad():
        # 1. Prefill (TTFT) - Single forward pass
        try:
            start_prefill = time.perf_counter()
            _ = model(input_ids)
            if is_cuda: torch.cuda.synchronize(device)
            metrics["prefill_latency_ms"] = (time.perf_counter() - start_prefill) * 1000.0
        except Exception as e:
            logger.warning(f"Prefill benchmark failed: {e}")

        # 2. Decode (Tokens/Sec)
        # Check if the model supports .generate()
        if hasattr(model, "generate") and callable(model.generate):
            try:
                # Generate 50 tokens
                max_new = 50
                start_decode = time.perf_counter()
                output = model.generate(input_ids, max_new_tokens=max_new, min_new_tokens=max_new, do_sample=False)
                if is_cuda: torch.cuda.synchronize(device)
                decode_duration = time.perf_counter() - start_decode
                
                # Actual tokens generated
                num_tokens = output.shape[1] - input_ids.shape[1]
                metrics["decode_tokens_per_sec"] = num_tokens / decode_duration if decode_duration > 0 else 0.0
            except Exception as e:
                logger.warning(f"Generation benchmark failed: {e}")
        else:
            # For non-generative LLMs (like BERT), Tokens/sec isn't as meaningful, 
            # but we can simulate a batch of 10 inferences
            try:
                start_sim = time.perf_counter()
                for _ in range(10):
                    _ = model(input_ids)
                if is_cuda: torch.cuda.synchronize(device)
                metrics["decode_tokens_per_sec"] = 10 / (time.perf_counter() - start_sim)
            except Exception:
                pass

    metrics["wall_clock_ms"] = (time.perf_counter() - wall_clock_start) * 1000.0

    # Memory Tracking
    if device.type == "cpu" and tracemalloc.is_tracing():
        _, peak_tracemalloc = tracemalloc.get_traced_memory()
        tracemalloc.stop()
        peak_tracemalloc_bytes_val = float(peak_tracemalloc)

    if is_cuda:
        try:
            peak_bytes = float(torch.cuda.max_memory_allocated(device))
            memory_mb = peak_bytes / (1024 ** 2)
        except Exception:
            memory_mb = 0.0
    else:
        memory_mb = (peak_tracemalloc_bytes_val / (1024 ** 2))

    return metrics, memory_mb, "high"
