import requests
import json
import re
from typing import Optional, Dict, Any

class LMStudioClient:
    def __init__(self, host: str = "127.0.0.1", port: int = 1234):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        self.host_is_local = host in ["127.0.0.1", "localhost"]

    def _get_models_from_api(self) -> list[dict[str, Any]]:
        """Helper to get models from any available endpoint."""
        urls_to_try = [
            f"{self.base_url}/api/v1/models",
            f"{self.base_url}/v1/models"
        ]
        
        # If host is localhost, also try 127.0.0.1 and vice versa on failure
        if self.host_is_local:
            alt_host = "127.0.0.1" if self.host == "localhost" else "localhost"
            urls_to_try.extend([
                f"http://{alt_host}:{self.port}/api/v1/models",
                f"http://{alt_host}:{self.port}/v1/models"
            ])

        for url in urls_to_try:
            try:
                print(f"LM Studio Client: Fetching models from {url}...")
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    # Internal API uses 'models', OpenAI compat uses 'data'
                    models = data.get('models', data.get('data', []))
                    
                    # DEBUG LOGGING: Print the raw JSON of the first model found to see its structure
                    if models:
                        print(f"LM Studio Client: DEBUG - First model raw JSON: {json.dumps(models[0], indent=2)}")
                        print(f"LM Studio Client: Found {len(models)} models at {url}")
                        return models
            except Exception as e:
                pass
        return []

    def sync_loaded_model(self, model_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Detects loaded model in LM Studio and converts it to SysAware ModelAnalysis format.
        """
        models = self._get_models_from_api()
        if not models:
            print("LM Studio Client: No models found during sync.")
            return None

        # Helper to check if a model object is loaded in LM Studio
        def is_model_loaded(m):
            is_loaded = m.get('loaded', False)
            state = str(m.get('state', '')).lower()
            instances = m.get('loaded_instances', [])
            return is_loaded or state == 'loaded' or (isinstance(instances, list) and len(instances) > 0)

        if model_id:
            # Look for a specific model by ID
            for model in models:
                current_id = model.get('key') or model.get('id') or model.get('display_name')
                instances = model.get('loaded_instances', [])
                
                # Check for ID match (key, id, name, or inside loaded_instances)
                match = (current_id == model_id)
                if not match and isinstance(instances, list):
                    for inst in instances:
                        if inst.get('id') == model_id:
                            match = True
                            break
                            
                if match and is_model_loaded(model):
                    print(f"LM Studio Client: SUCCESS - Detected specific loaded model: {current_id}")
                    return self._map_to_analysis(model)

        # Fallback (or if no model_id was passed): find the first loaded model
        for model in models:
            current_id = model.get('key') or model.get('id') or model.get('display_name')
            if is_model_loaded(model):
                print(f"LM Studio Client: SUCCESS - Detected loaded model: {current_id}")
                return self._map_to_analysis(model)
        
        # Fallback: If only one model exists in the whole system, it might be the loaded one
        if len(models) == 1:
            print(f"LM Studio Client: Only one model found, assuming it's the active one: {models[0].get('key') or models[0].get('display_name')}")
            return self._map_to_analysis(models[0])

        print("LM Studio Client: No explicitly loaded model detected among multiple candidates.")
        return None

    def get_all_models(self) -> list[dict[str, Any]]:
        """Lists all downloaded models in LM Studio."""
        models = self._get_models_from_api()
        return [self._map_to_analysis(m) for m in models]

    def load_model(self, model_id: str) -> bool:
        """Tells LM Studio to load a specific model."""
        url = f"{self.base_url}/api/v1/models/load"
        try:
            # LM Studio v1 API uses "model" key for the identifier
            print(f"LM Studio Client: Loading model '{model_id}'...")
            response = requests.post(url, json={"model": model_id}, timeout=60)
            return response.status_code == 200
        except Exception as e:
            print(f"LM Studio Client: Load failed: {e}")
            return False

    def unload_model(self, model_id: Optional[str] = None) -> bool:
        """Tells LM Studio to unload a model (or all models if None)."""
        url = f"{self.base_url}/api/v1/models/unload"
        
        payload = {}
        if model_id:
            payload = {"instance_id": model_id}
            
        try:
            print(f"LM Studio Client: Attempting unload with payload: {payload}")
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                print("LM Studio Client: Unload successful.")
                return True
            
            # If surgical unload fails, try a global unload as fallback
            if model_id:
                print(f"LM Studio Client: Surgical unload failed ({response.status_code}), trying global cleanup...")
                response = requests.post(url, json={}, timeout=10)
                return response.status_code == 200
                
            return False
        except Exception as e:
            print(f"LM Studio Client: Unload failed: {e}")
            return False

    def chat_stream(self, messages: list[dict[str, str]], model_id: Optional[str] = None):
        """Streams chat completions from LM Studio (OpenAI compatible)."""
        sanitized = [m for m in messages if m.get('content', '').strip()]
        
        while sanitized and sanitized[0].get('role') == 'assistant':
            sanitized.pop(0)
            
        if not any(m.get('role') == 'system' for m in sanitized):
            sanitized.insert(0, {
                "role": "system", 
                "content": "You are SysAware Assistant, a hardware-aware AI. Provide concise, accurate technical advice."
            })
            
        if not model_id:
            analysis = self.sync_loaded_model()
            if analysis:
                model_id = analysis.get('model_id') or analysis.get('model_name')
        
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model_id or "default",
            "messages": sanitized,
            "stream": True,
            "temperature": 0.7
        }
        
        try:
            response = requests.post(url, json=payload, stream=True, timeout=(30, 60))
            if response.status_code != 200:
                yield {"error": f"LM Studio error {response.status_code}"}
                return

            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith("data: "):
                        data_str = decoded[6:].strip()
                        if data_str == "[DONE]": break
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                content = data['choices'][0]['delta'].get('content', '')
                                if content: yield {"content": content}
                        except: continue
        except Exception as e:
            yield {"error": str(e)}

    def _map_to_analysis(self, lm_model: Dict[str, Any]) -> Dict[str, Any]:
        """Maps LM Studio model metadata to SysAware ModelAnalysis structure."""
        # LM Studio 0.4.x uses 'key' as the primary model identifier
        # and 'display_name' for UI.
        name = lm_model.get('display_name', lm_model.get('key', lm_model.get('id', 'Unknown')))
        
        # model_id is used for both load (needs 'key') and unload (needs 'instance_id')
        # By default, use the key
        model_id = lm_model.get('key', name)
        
        # For loaded models, we want the specific instance identifier for unloading
        instances = lm_model.get('loaded_instances', [])
        if isinstance(instances, list) and len(instances) > 0:
            # Prefer the first active instance's 'id' as the 'instance_id' for unloading
            first_inst = instances[0]
            if isinstance(first_inst, dict):
                model_id = first_inst.get('id', model_id)

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
        
        # Heuristic from name if missing
        if num_params == 0:
            l_name = name.lower()
            if '7b' in l_name: num_params = 7_000_000_000
            elif '14b' in l_name: num_params = 14_000_000_000
            elif '0.5b' in l_name: num_params = 500_000_000
            elif '0.8b' in l_name: num_params = 800_000_000
            elif '8b' in l_name: num_params = 8_000_000_000
            elif '70b' in l_name: num_params = 70_000_000_000
        
        size_bytes = lm_model.get('size_bytes', 0)
        size_mb = size_bytes / (1024 * 1024) if size_bytes else 0.0
        path = lm_model.get('path', '')
        
        is_loaded = lm_model.get('loaded', False)
        state = str(lm_model.get('state', '')).lower()
        instances = lm_model.get('loaded_instances', [])
        loaded_in_memory = is_loaded or state == 'loaded' or (isinstance(instances, list) and len(instances) > 0)
        
        # The base key of the model in LM Studio (stable across load states)
        base_id = lm_model.get('key', lm_model.get('id', name))
        
        # Safe extraction of quantization
        quantization_val = lm_model.get('quantization')
        quantization_name = 'unknown'
        if isinstance(quantization_val, dict):
            quantization_name = quantization_val.get('name', 'unknown')
        elif isinstance(quantization_val, str):
            quantization_name = quantization_val
        
        return {
            "model_name": name,
            "model_id": model_id,
            "base_id": base_id,
            "num_params": num_params,
            "trainable_params": 0,
            "size_mb": size_mb,
            "layer_types": {
                "Architecture": lm_model.get('architecture', 'unknown'),
                "Quantization": quantization_name,
                "Format": lm_model.get('format', 'unknown')
            },
            "is_external": True,
            "external_source": "LM Studio",
            "path": path,
            "loaded": loaded_in_memory
        }
