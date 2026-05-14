import requests
import json
import os
import re
from typing import Optional, Dict, Any

class LMStudioClient:
    def __init__(self, host: str = "127.0.0.1", port: int = 1234):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"

    def sync_loaded_model(self) -> Optional[Dict[str, Any]]:
        """
        Detects loaded model in LM Studio and converts it to SysAware ModelAnalysis format.
        """
        try:
            # Try native API (LM Studio 0.3+)
            response = requests.get(f"{self.base_url}/api/v1/models", timeout=3)
            if response.status_code == 200:
                data = response.json()
                # Newer versions use 'models' key
                models = data.get('models', data.get('data', []))
                
                for model in models:
                    # Check if loaded (newer versions use loaded_instances)
                    is_loaded = model.get('loaded', False)
                    if not is_loaded:
                        instances = model.get('loaded_instances', [])
                        if isinstance(instances, list) and len(instances) > 0:
                            is_loaded = True
                    
                    if is_loaded:
                        return self._map_to_analysis(model)
            
            # Fallback to OpenAI /v1/models (less reliable for 'loaded' status)
            response = requests.get(f"{self.base_url}/v1/models", timeout=3)
            if response.status_code == 200:
                models = response.json().get('data', [])
                if models:
                    return self._map_to_analysis(models[0])
                    
        except Exception as e:
            print(f"LM Studio sync error: {e}")
        return None

    def _map_to_analysis(self, lm_model: Dict[str, Any]) -> Dict[str, Any]:
        """Maps LM Studio model metadata to SysAware ModelAnalysis structure."""
        name = lm_model.get('display_name', lm_model.get('id', lm_model.get('key', 'Unknown')))
        
        # Extract param count from params_string (e.g. "0.5B" or "14B")
        params_str = lm_model.get('params_string', '')
        num_params = 0
        if params_str:
            try:
                val = float(re.findall(r"[\d\.]+", params_str)[0])
                if 'B' in params_str.upper():
                    num_params = int(val * 1_000_000_000)
                elif 'M' in params_str.upper():
                    num_params = int(val * 1_000_000)
            except:
                pass
        
        # If still 0, try heuristic from name
        if num_params == 0:
            if '7b' in name.lower(): num_params = 7_000_000_000
            elif '8b' in name.lower(): num_params = 8_000_000_000
            elif '14b' in name.lower(): num_params = 14_000_000_000
            elif '70b' in name.lower(): num_params = 70_000_000_000
        
        size_bytes = lm_model.get('size_bytes', 0)
        size_mb = size_bytes / (1024 * 1024) if size_bytes else 0.0
        
        # Path might be in different places
        path = lm_model.get('path', '')
        
        return {
            "model_name": name,
            "num_params": num_params,
            "trainable_params": 0,
            "size_mb": size_mb,
            "layer_types": {
                "Architecture": lm_model.get('architecture', 'unknown'),
                "Quantization": lm_model.get('quantization', {}).get('name', 'unknown'),
                "Format": lm_model.get('format', 'unknown')
            },
            "is_external": True,
            "external_source": "LM Studio",
            "path": path
        }
