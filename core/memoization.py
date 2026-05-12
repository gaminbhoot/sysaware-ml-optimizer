import json
import os
import hashlib
from typing import Any, Optional

CACHE_FILE = ".sysaware_cache.json"

def _generate_cache_key(model_hash: str, goal: str, system_profile: dict) -> str:
    """Generates a unique key for the specific model, goal, and hardware setup."""
    # We only care about major hardware specs for caching
    hw_summary = {
        "cpu": system_profile.get("cpu_cores"),
        "ram": system_profile.get("ram_gb"),
        "dgpu": system_profile.get("dgpu_name"),
        "os": system_profile.get("os")
    }
    key_data = f"{model_hash}:{goal}:{json.dumps(hw_summary, sort_keys=True)}"
    return hashlib.sha256(key_data.encode()).hexdigest()

def get_cached_strategy(model_hash: str, goal: str, system_profile: dict) -> Optional[dict]:
    """Retrieves a previously computed strategy if it exists."""
    if not os.path.exists(CACHE_FILE):
        return None
    
    key = _generate_cache_key(model_hash, goal, system_profile)
    try:
        with open(CACHE_FILE, "r") as f:
            cache = json.load(f)
            return cache.get(key)
    except Exception:
        return None

def save_strategy_to_cache(model_hash: str, goal: str, system_profile: dict, result: dict):
    """Saves a computed strategy to the local cache."""
    key = _generate_cache_key(model_hash, goal, system_profile)
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r") as f:
                cache = json.load(f)
        except Exception:
            pass
    
    cache[key] = result
    try:
        with open(CACHE_FILE, "w") as f:
            json.dump(cache, f, indent=2)
    except Exception:
        pass
