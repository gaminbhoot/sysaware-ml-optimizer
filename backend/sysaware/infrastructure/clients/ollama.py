import requests
import json
import re
from typing import Optional, Dict, Any

class OllamaClient:
    def __init__(self, host: str = "127.0.0.1", port: int = 11434):
        self.host = host
        self.port = port
        self.base_url = f"http://{host}:{port}"
        self.host_is_local = host in ["127.0.0.1", "localhost"]

    def _get_loaded_models(self) -> list[str]:
        """Fetches list of currently running/loaded models from Ollama's /api/ps endpoint."""
        url = f"{self.base_url}/api/ps"
        try:
            response = requests.get(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            pass
        return []

    def _get_models_from_api(self) -> list[dict[str, Any]]:
        """Fetches all downloaded models in Ollama."""
        url = f"{self.base_url}/api/tags"
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get("models", [])
        except Exception as e:
            print(f"Ollama Client: Failed to fetch models: {e}")
        return []

    def sync_loaded_model(self, model_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Detects loaded model in Ollama and converts it to SysAware ModelAnalysis format.
        """
        loaded_names = self._get_loaded_models()
        all_models = self._get_models_from_api()
        
        if not all_models:
            return None

        # Helper to find a model by ID/name in the list
        def find_model(target_name: str):
            for m in all_models:
                name = m.get("name", "")
                if name == target_name or name.split(":")[0] == target_name.split(":")[0]:
                    return m
            return None

        if model_id:
            # Check if specified model is loaded
            matched_loaded = [n for n in loaded_names if n == model_id or n.split(":")[0] == model_id.split(":")[0]]
            if matched_loaded:
                model_data = find_model(matched_loaded[0])
                if model_data:
                    return self._map_to_analysis(model_data, is_loaded=True)
        
        # Default to first loaded model
        if loaded_names:
            model_data = find_model(loaded_names[0])
            if model_data:
                return self._map_to_analysis(model_data, is_loaded=True)

        # Fallback: if only one model exists in tags, assume it is loaded
        if len(all_models) == 1:
            return self._map_to_analysis(all_models[0], is_loaded=False)

        return None

    def get_all_models(self) -> list[dict[str, Any]]:
        """Lists all downloaded models in Ollama with their loaded status."""
        loaded_names = self._get_loaded_models()
        all_models = self._get_models_from_api()
        
        results = []
        for m in all_models:
            name = m.get("name", "")
            is_loaded = any(n == name or n.split(":")[0] == name.split(":")[0] for n in loaded_names)
            results.append(self._map_to_analysis(m, is_loaded=is_loaded))
        return results

    def load_model(self, model_id: str) -> bool:
        """Tells Ollama to load a specific model in memory by calling /api/generate with empty prompt."""
        url = f"{self.base_url}/api/generate"
        try:
            print(f"Ollama Client: Loading model '{model_id}'...")
            response = requests.post(url, json={"model": model_id}, timeout=60)
            return response.status_code == 200
        except Exception as e:
            print(f"Ollama Client: Load failed: {e}")
            return False

    def unload_model(self, model_id: Optional[str] = None) -> bool:
        """Tells Ollama to unload a model (or all loaded models if model_id is None)."""
        url = f"{self.base_url}/api/generate"
        
        loaded_names = self._get_loaded_models()
        if not loaded_names:
            return True
            
        targets = [model_id] if model_id else loaded_names
        
        success = True
        for target in targets:
            try:
                print(f"Ollama Client: Unloading model '{target}'...")
                response = requests.post(url, json={"model": target, "keep_alive": 0}, timeout=10)
                if response.status_code != 200:
                    success = False
            except Exception as e:
                print(f"Ollama Client: Unload failed for {target}: {e}")
                success = False
        return success

    def chat_stream(self, messages: list[dict[str, str]], model_id: Optional[str] = None):
        """Streams chat completions from Ollama API (/api/chat)."""
        sanitized = [m for m in messages if m.get('content', '').strip()]
        
        if not model_id:
            analysis = self.sync_loaded_model()
            if analysis:
                model_id = analysis.get('model_id') or analysis.get('model_name')
        
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model_id or "default",
            "messages": sanitized,
            "stream": True
        }
        
        try:
            response = requests.post(url, json=payload, stream=True, timeout=(30, 60))
            if response.status_code != 200:
                yield {"error": f"Ollama error {response.status_code}"}
                return

            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    try:
                        data = json.loads(decoded)
                        if 'message' in data and 'content' in data['message']:
                            yield {"content": data['message']['content']}
                        if data.get('done', False):
                            break
                    except Exception:
                        continue
        except Exception as e:
            yield {"error": str(e)}

    def _map_to_analysis(self, ollama_model: Dict[str, Any], is_loaded: bool = False) -> Dict[str, Any]:
        """Maps Ollama model metadata to SysAware ModelAnalysis structure."""
        name = ollama_model.get('name', 'Unknown')
        model_id = name
        
        details = ollama_model.get('details', {})
        param_str = details.get('parameter_size', '')
        
        num_params = 0
        if param_str:
            try:
                val = float(re.findall(r"[\d\.]+", param_str)[0])
                if 'B' in param_str.upper():
                    num_params = int(val * 1_000_000_000)
                elif 'M' in param_str.upper():
                    num_params = int(val * 1_000_000)
            except Exception:
                pass

        if num_params == 0:
            l_name = name.lower()
            if '7b' in l_name: num_params = 7_000_000_000
            elif '14b' in l_name: num_params = 14_000_000_000
            elif '0.5b' in l_name: num_params = 500_000_000
            elif '0.8b' in l_name: num_params = 800_000_000
            elif '8b' in l_name: num_params = 8_000_000_000
            elif '70b' in l_name: num_params = 70_000_000_000

        size_bytes = ollama_model.get('size', 0)
        size_mb = size_bytes / (1024 * 1024) if size_bytes else 0.0
        
        return {
            "model_name": name,
            "model_id": model_id,
            "base_id": name.split(":")[0],  # stable base id (excluding tag)
            "num_params": num_params,
            "trainable_params": 0,
            "size_mb": size_mb,
            "layer_types": {
                "Architecture": details.get('family', 'unknown'),
                "Quantization": details.get('quantization_level', 'unknown'),
                "Format": details.get('format', 'unknown')
            },
            "is_external": True,
            "external_source": "Ollama",
            "path": name,
            "loaded": is_loaded
        }
