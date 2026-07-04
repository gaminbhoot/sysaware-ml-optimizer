import os
import sys
import re
import time
import subprocess
import anyio
from huggingface_hub import HfApi

from ...core import model_analyzer as ma
from sysaware.infrastructure import store as store
from sysaware.infrastructure import system_profiler as sp
from sysaware.infrastructure.clients import ollama as ollama
from sysaware.infrastructure.clients import lmstudio as lms
from sysaware.infrastructure.model_loader import load_model_from_path
from sysaware.infrastructure.logging_utils import get_logger

logger = get_logger("sysaware.api.services.models")

# --- Caching ---
_analysis_cache = {}
_RECOMMENDATIONS_CACHE = {}
_CACHE_EXPIRY_SECONDS = 3600

def get_cached_analysis(model_path: str):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    return _analysis_cache.get(cache_key)

def set_cached_analysis(model_path: str, analysis: dict):
    mtime = os.path.getmtime(model_path)
    cache_key = f"{model_path}_{mtime}"
    if len(_analysis_cache) > 20:
        _analysis_cache.clear()
    _analysis_cache[cache_key] = analysis

# --- Dynamic Recommendations Helpers ---
FALLBACK_MODELS = [
    {
        "repo_id": "mlx-community/Llama-3.2-3B-Instruct-4bit",
        "name": "Llama 3.2 3B Instruct",
        "size": "3B",
        "format": "MLX (Apple Silicon)",
        "description": "Meta's highly capable lightweight model, optimized for mobile & edge devices on Apple Silicon.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/mlx-community/Llama-3.2-3B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Phi-3.5-mini-instruct-4bit",
        "name": "Phi 3.5 Mini",
        "size": "3.8B",
        "format": "MLX (Apple Silicon)",
        "description": "Microsoft's state-of-the-art small language model with incredible reasoning for its size.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/mlx-community/Phi-3.5-mini-instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Meta-Llama-3-8B-Instruct-4bit",
        "name": "Llama 3 8B Instruct",
        "size": "8B",
        "format": "MLX (Apple Silicon)",
        "description": "The gold standard for 8B models. Superb dialogue, instruction following, and general reasoning.",
        "ramNeeded": 6,
        "link": "https://huggingface.co/mlx-community/Meta-Llama-3-8B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Gemma-2-9b-it-4bit",
        "name": "Gemma 2 9B IT",
        "size": "9B",
        "format": "MLX (Apple Silicon)",
        "description": "Google's ultra-efficient 9B model, known for clean outputs and strong factual accuracy.",
        "ramNeeded": 7,
        "link": "https://huggingface.co/mlx-community/Gemma-2-9b-it-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-7B-Instruct-4bit",
        "name": "Qwen 2.5 7B Instruct",
        "size": "7B",
        "format": "MLX (Apple Silicon)",
        "description": "Outstanding multilingual capability and strong coding/math intelligence.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-7B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit",
        "name": "Mistral NeMo 12B",
        "size": "12B",
        "format": "MLX (Apple Silicon)",
        "description": "A joint 12B model from Mistral AI and NVIDIA, optimized for Apple hardware.",
        "ramNeeded": 9,
        "link": "https://huggingface.co/mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit"
    },
    {
        "repo_id": "bartowski/Llama-3.2-3B-Instruct-GGUF",
        "name": "Llama 3.2 3B Instruct",
        "size": "3B",
        "format": "GGUF (Cross-platform)",
        "description": "Highly optimized lightweight model. Runs smoothly on laptops with lower VRAM or RAM specs.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Qwen2.5-14B-Instruct-GGUF",
        "name": "Qwen 2.5 14B Instruct",
        "size": "14B",
        "format": "GGUF (Cross-platform)",
        "description": "Excellent model for detailed code generation and multi-step reasoning tasks.",
        "ramNeeded": 10,
        "link": "https://huggingface.co/lmstudio-community/Qwen2.5-14B-Instruct-GGUF"
    },
    {
        "repo_id": "bartowski/gemma-2-27b-it-GGUF",
        "name": "Gemma 2 27B IT",
        "size": "27B",
        "format": "GGUF (Cross-platform)",
        "description": "Google's high-efficiency model, punching way above its weight in reasoning tasks.",
        "ramNeeded": 18,
        "link": "https://huggingface.co/bartowski/gemma-2-27b-it-GGUF"
    },
    {
        "repo_id": "MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF",
        "name": "Llama 3.1 70B Instruct",
        "size": "70B",
        "format": "GGUF (Cross-platform)",
        "description": "Massive reasoning model. Requires high-end multi-GPU setups or significant system RAM.",
        "ramNeeded": 44,
        "link": "https://huggingface.co/MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF"
    }
]

def format_model_name(repo_id: str) -> str:
    name = repo_id.split('/')[-1]
    suffixes = [
        '-4bit', '-8bit', '-2bit', '-GGUF', '-gguf', '_GGUF', '_gguf', 
        '-it', '-Instruct', '-instruct', '-qat', '-OptiQ', '-mlx', 
        '-DQ3_K_M', '-q8', '-Q8', '-MXFP4-Q8', '-MXFP4_MOE', '-Q8_0',
        '-IQ4_XS'
    ]
    changed = True
    while changed:
        changed = False
        for s in suffixes:
            if name.endswith(s):
                name = name[:-len(s)]
                changed = True
    name = name.replace('-', ' ').replace('_', ' ')
    return name.strip()

def get_model_size(repo_id: str) -> str:
    match = re.search(r'\b(\d+x)?\d+(\.\d+)?[mMbB]\b', repo_id)
    if match:
        return match.group(0).upper()
    match = re.search(r'(\d+x)?\d+(\.\d+)?[mMbB]', repo_id)
    if match:
        return match.group(0).upper()
    return "Unknown"

def estimate_ram_needed(repo_id: str) -> int:
    size_str = get_model_size(repo_id)
    if size_str == "Unknown":
        return 4
    
    try:
        val = size_str.lower()
        if 'x' in val:
            parts = val.split('x')
            num = float(parts[0]) * float(parts[1].replace('b', '').replace('m', ''))
        elif 'b' in val:
            num = float(val.replace('b', ''))
        elif 'm' in val:
            num = float(val.replace('m', '')) / 1000.0
        else:
            num = float(val)
    except Exception:
        return 4
        
    is_4bit = any(x in repo_id.lower() for x in ["4bit", "q4", "iq4"])
    is_8bit = any(x in repo_id.lower() for x in ["8bit", "q8"])
    
    if is_4bit:
        ram = int(num * 0.6) + 1.5
    elif is_8bit:
        ram = int(num * 1.1) + 1.5
    else:
        ram = int(num * 0.6) + 1.5
        
    return max(round(ram), 2)

def generate_description(repo_id: str, downloads: int, likes: int) -> str:
    author = repo_id.split('/')[0]
    size = get_model_size(repo_id)
    desc = f"Popular {size} model by {author}."
    if downloads > 1000:
        desc += f" Over {downloads // 1000}k downloads on Hugging Face."
    elif downloads > 0:
        desc += f" {downloads} downloads on Hugging Face."
    return desc

async def browse_model_file(is_path_allowed_fn) -> dict:
    """Invokes system file dialog for choosing model path."""
    if sys.platform == "darwin":
        def run_osascript():
            script = 'POSIX path of (choose file with prompt "Select PyTorch Model:")'
            return subprocess.run(
                ['osascript', '-e', script],
                capture_output=True, text=True, check=True
            )
        try:
            result = await anyio.to_thread.run_sync(run_osascript)
            file_path = result.stdout.strip()
            if not is_path_allowed_fn(file_path):
                return {"status": "error", "error_type": "path_not_allowed", "detail": "Access denied: Model path is outside configured model directories."}
            return {"status": "success", "path": file_path}
        except subprocess.CalledProcessError as e:
            return {"status": "cancelled", "detail": e.stderr}
    else:
        def tk_browse():
            try:
                import tkinter as tk
                from tkinter import filedialog
                root = tk.Tk()
                root.withdraw()
                root.wm_attributes('-topmost', 1)
                file_path = filedialog.askopenfilename(master=root, filetypes=[("PyTorch Models", "*.pt *.pth"), ("All Files", "*.*")])
                root.destroy()
                return file_path
            except Exception:
                return ""
        file_path = await anyio.to_thread.run_sync(tk_browse)
        if file_path and not is_path_allowed_fn(file_path):
            return {"status": "error", "error_type": "path_not_allowed", "detail": "Access denied: Model path is outside configured model directories."}
        return {"status": "success", "path": file_path}

async def analyze_model(model_path: str, unsafe_load: bool) -> dict:
    """Analyze the architecture of a PyTorch model and return parameter count, layer structure, etc."""
    cached = get_cached_analysis(model_path)
    if cached:
        return {"status": "success", "analysis": cached, "cached": True}

    model_obj = await anyio.to_thread.run_sync(load_model_from_path, model_path, unsafe_load)
    analysis = await anyio.to_thread.run_sync(ma.analyze_model, model_obj)
    set_cached_analysis(model_path, analysis)
    return {"status": "success", "analysis": analysis}

async def unload_model(model_id: str, host: str, port: int) -> dict:
    """Unloads a model from Ollie or LM Studio memory."""
    if port == 11434:
        client = ollama.OllamaClient(host=host, port=port)
        await anyio.to_thread.run_sync(client.unload_model, model_id)
        return {"status": "success", "message": f"Model {model_id or ''} unloaded from Ollama memory"}
    else:
        client = lms.LMStudioClient(host=host, port=port)
        await anyio.to_thread.run_sync(client.unload_model, model_id)
        return {"status": "success", "message": f"Model {model_id or ''} unloaded from LM Studio memory"}

async def register_model(model_hash: str, model_name: str, reference_latency: float, reference_memory_mb: float, reference_throughput: float, metadata: dict) -> dict:
    """Registers reference specs in storage."""
    await anyio.to_thread.run_sync(
        store.register_reference_model,
        model_hash,
        model_name,
        reference_latency,
        reference_memory_mb,
        reference_throughput,
        metadata
    )
    return {"status": "success"}

async def check_drift(model_hash: str, current_latency: float, current_throughput: float | None) -> dict:
    """Checks for drift against reference specifications."""
    result = await anyio.to_thread.run_sync(
        store.detect_drift,
        model_hash,
        current_latency,
        current_throughput
    )
    return result

async def get_recommendations() -> dict:
    """Retrieve dynamic model recommendations from HF Hub or fallback models."""
    global _RECOMMENDATIONS_CACHE
    now = time.time()
    profile = await anyio.to_thread.run_sync(sp.get_system_profile)
    is_mac = "darwin" in profile.get("os", "").lower() or "mac" in profile.get("os", "").lower()
    is_metal = profile.get("gpu_backend", "").lower() in ["metal", "mps"] or is_mac
    
    cache_key = "mlx" if is_metal else "gguf"
    
    if cache_key in _RECOMMENDATIONS_CACHE:
        cached = _RECOMMENDATIONS_CACHE[cache_key]
        if now - cached["timestamp"] < _CACHE_EXPIRY_SECONDS:
            return {"status": "success", "recommendations": cached["data"]}
            
    def fetch_from_hf():
        api = HfApi()
        results = []
        
        if is_metal:
            models = api.list_models(
                author="mlx-community",
                filter="text-generation",
                sort="downloads",
                limit=30,
                expand=["downloads", "likes"]
            )
            fmt = "MLX (Apple Silicon)"
        else:
            models = api.list_models(
                filter=["gguf", "text-generation"],
                sort="downloads",
                limit=30,
                expand=["downloads", "likes"]
            )
            fmt = "GGUF (Cross-platform)"
            
        for m in models:
            if not m.id:
                continue
            downloads = getattr(m, "downloads", 0) or 0
            likes = getattr(m, "likes", 0) or 0
            
            if downloads < 100:
                continue
                
            size = get_model_size(m.id)
            if size == "Unknown":
                continue
                
            ram_needed = estimate_ram_needed(m.id)
            name = format_model_name(m.id)
            desc = generate_description(m.id, downloads, likes)
            
            results.append({
                "repo_id": m.id,
                "name": name,
                "size": size,
                "format": fmt,
                "description": desc,
                "ramNeeded": ram_needed,
                "link": f"https://huggingface.co/{m.id}"
            })
        
        results.sort(key=lambda x: x.get("downloads", 0), reverse=True)
        return results

    try:
        recs = await anyio.to_thread.run_sync(fetch_from_hf)
        if not recs:
            recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
    except Exception as hf_err:
        logger.warning(f"Failed to fetch from HF Hub: {hf_err}, using fallback models.")
        recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
        
    _RECOMMENDATIONS_CACHE[cache_key] = {
        "timestamp": now,
        "data": recs
    }
    
    return {"status": "success", "recommendations": recs}
