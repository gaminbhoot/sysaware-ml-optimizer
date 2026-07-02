import os
import sys
import re
import time
import subprocess
import anyio
from fastapi import APIRouter, HTTPException
from huggingface_hub import HfApi

from ...core import model_analyzer as ma
from ...core import store as store
from ...core import system_profiler as sp
from ...core import ollama as ollama
from ...core import lmstudio as lms
from ...cli import load_model_from_path

from ..schemas import (
    AnalyzeRequest,
    UnloadRequest,
    ModelRegisterRequest,
    DriftRequest,
)
from ..helpers import (
    is_path_allowed,
    validate_model_path_and_load,
    validate_host_and_port,
    handle_api_exception,
)
from ..middleware import model_concurrency

router = APIRouter(prefix="/api")

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
        "description": "Collaborative effort between NVIDIA and Mistral. State-of-the-art for its size.",
        "ramNeeded": 9,
        "link": "https://huggingface.co/mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-14B-Instruct-4bit",
        "name": "Qwen 2.5 14B Instruct",
        "size": "14B",
        "format": "MLX (Apple Silicon)",
        "description": "High-performance model bridging the gap between lightweight edge and server-class reasoning.",
        "ramNeeded": 10,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-14B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-32B-Instruct-4bit",
        "name": "Qwen 2.5 32B Instruct",
        "size": "32B",
        "format": "MLX (Apple Silicon)",
        "description": "Server-class reasoning capabilities, offering highly detailed responses and complex coding skills.",
        "ramNeeded": 21,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-32B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Meta-Llama-3-70B-Instruct-4bit",
        "name": "Llama 3 70B Instruct",
        "size": "70B",
        "format": "MLX (Apple Silicon)",
        "description": "State-of-the-art open weight reasoning and comprehension model. Requires massive unified memory.",
        "ramNeeded": 44,
        "link": "https://huggingface.co/mlx-community/Meta-Llama-3-70B-Instruct-4bit"
    },
    {
        "repo_id": "mlx-community/Qwen2.5-72B-Instruct-4bit",
        "name": "Qwen 2.5 72B Instruct",
        "size": "72B",
        "format": "MLX (Apple Silicon)",
        "description": "Maximum reasoning performance for deep logic, complex coding, and specialized research.",
        "ramNeeded": 45,
        "link": "https://huggingface.co/mlx-community/Qwen2.5-72B-Instruct-4bit"
    },
    {
        "repo_id": "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
        "name": "Llama 3 8B Instruct",
        "size": "8B",
        "format": "GGUF (Cross-platform)",
        "description": "Perfect for LM Studio integration on Windows/Linux with CUDA or CPU backend.",
        "ramNeeded": 6,
        "link": "https://huggingface.co/lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
        "name": "Mistral 7B v0.3",
        "size": "7B",
        "format": "GGUF (Cross-platform)",
        "description": "Reliable and efficient 7B baseline. Excellent for general utility and summarization.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Phi-3.5-mini-instruct-GGUF",
        "name": "Phi 3.5 Mini",
        "size": "3.8B",
        "format": "GGUF (Cross-platform)",
        "description": "Highly efficient reasoning in a compact GGUF format for cross-platform hardware.",
        "ramNeeded": 3,
        "link": "https://huggingface.co/lmstudio-community/Phi-3.5-mini-instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Qwen2.5-7B-Instruct-GGUF",
        "name": "Qwen 2.5 7B Instruct",
        "size": "7B",
        "format": "GGUF (Cross-platform)",
        "description": "Outstanding multilingual capability. Runs extremely well on standard GPUs or CPU threads.",
        "ramNeeded": 5,
        "link": "https://huggingface.co/lmstudio-community/Qwen2.5-7B-Instruct-GGUF"
    },
    {
        "repo_id": "lmstudio-community/Llama-3.2-3B-Instruct-GGUF",
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

# --- Endpoints ---
@router.get("/model/browse")
async def browse_model():
    try:
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
                if not is_path_allowed(file_path):
                    raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
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
            if file_path and not is_path_allowed(file_path):
                raise HTTPException(status_code=400, detail="Access denied: Model path is outside configured model directories.")
            return {"status": "success", "path": file_path}
    except Exception as e:
        handle_api_exception(e)

@router.post("/model/analyze")
async def analyze_model_endpoint(req: AnalyzeRequest):
    validate_model_path_and_load(req.model_path, req.unsafe_load)
    
    import sysaware.server as server
    is_production = getattr(server, "IS_PRODUCTION", False)
    
    if not os.path.exists(req.model_path):
        if is_production:
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            raise HTTPException(status_code=404, detail="Model path not found")
        
    if not await model_concurrency.acquire():
        raise HTTPException(status_code=503, detail="Server is busy. Max concurrent model tasks reached.")
    
    try:
        cached = get_cached_analysis(req.model_path)
        if cached:
            return {"status": "success", "analysis": cached, "cached": True}
    
        model_obj = await anyio.to_thread.run_sync(load_model_from_path, req.model_path, req.unsafe_load)
        analysis = await anyio.to_thread.run_sync(ma.analyze_model, model_obj)
        set_cached_analysis(req.model_path, analysis)
        return {"status": "success", "analysis": analysis}
    except Exception as e:
        if is_production:
            print(f"Model analysis failed: {e}")
            raise HTTPException(status_code=400, detail="Failed to load or analyze model")
        else:
            handle_api_exception(e)
    finally:
        await model_concurrency.release()

@router.post("/model/unload")
async def unload_model(req: UnloadRequest):
    try:
        validate_host_and_port(req.host, req.port)
        if req.port == 11434:
            client = ollama.OllamaClient(host=req.host, port=req.port)
            await anyio.to_thread.run_sync(client.unload_model, req.model_id)
            return {"status": "success", "message": f"Model {req.model_id or ''} unloaded from Ollama memory"}
        else:
            client = lms.LMStudioClient(host=req.host, port=req.port)
            await anyio.to_thread.run_sync(client.unload_model, req.model_id)
            return {"status": "success", "message": f"Model {req.model_id or ''} unloaded from LM Studio memory"}
    except Exception as e:
        print(f"Model Unload failed: {e}")
        raise HTTPException(status_code=500, detail=f"Model unload failed: {str(e)}")

@router.post("/model/registry")
async def register_model(req: ModelRegisterRequest):
    try:
        await anyio.to_thread.run_sync(
            store.register_reference_model,
            req.model_hash,
            req.model_name,
            req.reference_latency,
            req.reference_memory_mb,
            req.reference_throughput,
            req.metadata
        )
        return {"status": "success"}
    except Exception as e:
        handle_api_exception(e)

@router.post("/model/drift")
async def check_drift(req: DriftRequest):
    try:
        result = await anyio.to_thread.run_sync(
            store.detect_drift,
            req.model_hash,
            req.current_latency,
            req.current_throughput
        )
        return result
    except Exception as e:
        handle_api_exception(e)

@router.get("/models/recommendations")
async def get_recommendations():
    global _RECOMMENDATIONS_CACHE
    try:
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
            
            # Sort by downloads descending
            results.sort(key=lambda x: x.get("downloads", 0), reverse=True)
            return results

        try:
            recs = await anyio.to_thread.run_sync(fetch_from_hf)
            if not recs:
                recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
        except Exception as hf_err:
            print(f"Failed to fetch from HF Hub: {hf_err}, using fallback models.")
            recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
            
        _RECOMMENDATIONS_CACHE[cache_key] = {
            "timestamp": now,
            "data": recs
        }
        
        return {"status": "success", "recommendations": recs}
        
    except Exception as e:
        try:
            profile = await anyio.to_thread.run_sync(sp.get_system_profile)
            is_mac = "darwin" in profile.get("os", "").lower() or "mac" in profile.get("os", "").lower()
            is_metal = profile.get("gpu_backend", "").lower() in ["metal", "mps"] or is_mac
            recs = [m for m in FALLBACK_MODELS if (is_metal and "MLX" in m["format"]) or (not is_metal and "GGUF" in m["format"])]
            return {"status": "success", "recommendations": recs}
        except Exception:
            return {"status": "success", "recommendations": FALLBACK_MODELS[:6]}
