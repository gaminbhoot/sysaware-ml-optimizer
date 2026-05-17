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
        self.host_is_local = host in ["127.0.0.1", "localhost"]

    def sync_loaded_model(self) -> Optional[Dict[str, Any]]:
        """
        Detects loaded model in LM Studio and converts it to SysAware ModelAnalysis format.
        """
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
                print(f"LM Studio Client: Trying {url}...")
                response = requests.get(url, timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    # Newer versions use 'models' key
                    models = data.get('models', data.get('data', []))
                    
                    if not models:
                        print(f"LM Studio Client: No models found at {url}")
                        continue

                    for model in models:
                        # Check if loaded (newer versions use loaded_instances)
                        is_loaded = model.get('loaded', False)
                        if not is_loaded:
                            instances = model.get('loaded_instances', [])
                            if isinstance(instances, list) and len(instances) > 0:
                                is_loaded = True
                        
                        # If we used /v1/models (OpenAI compat), 'loaded' might not be present.
                        # In that case, we just assume the first one returned might be the active one 
                        # IF there's only one. Or if it's the only way to get info.
                        if is_loaded or len(models) == 1:
                            print(f"LM Studio Client: Success at {url}")
                            return self._map_to_analysis(model)
            except Exception as e:
                print(f"LM Studio Client: Connection failed for {url}: {e}")
        
        return None

    def chat_stream(self, messages: list[dict[str, str]], model_id: Optional[str] = None):
        """Streams chat completions from LM Studio (OpenAI compatible)."""
        
        # Auto-detect model if not provided
        if not model_id:
            analysis = self.sync_loaded_model()
            if analysis:
                model_id = analysis.get('model_name')
        
        url = f"{self.base_url}/v1/chat/completions"
        payload = {
            "model": model_id or "default",
            "messages": messages,
            "stream": True,
            "temperature": 0.7
        }
        
        try:
            print(f"LM Studio Client: Starting chat stream for model '{payload['model']}'...")
            # Increase timeout to 30s for the first byte (LLM loading/warming up)
            response = requests.post(url, json=payload, stream=True, timeout=(30, 60))
            
            if response.status_code != 200:
                error_detail = response.text[:100]
                print(f"LM Studio Client: Error {response.status_code} - {error_detail}")
                yield {"error": f"LM Studio error {response.status_code}: {error_detail}"}
                return

            for line in response.iter_lines():
                if line:
                    decoded = line.decode('utf-8')
                    if decoded.startswith("data: "):
                        data_str = decoded[6:].strip()
                        if data_str == "[DONE]":
                            print("LM Studio Client: Stream complete.")
                            break
                        try:
                            data = json.loads(data_str)
                            if 'choices' in data and len(data['choices']) > 0:
                                content = data['choices'][0]['delta'].get('content', '')
                                if content:
                                    yield {"content": content}
                        except Exception as e:
                            print(f"LM Studio Client: JSON Parse Error: {e} for string: {data_str}")
                            continue
        except requests.exceptions.Timeout:
            print("LM Studio Client: Request timed out.")
            yield {"error": "LM Studio connection timed out. Ensure the model is loaded and ready."}
        except Exception as e:
            print(f"LM Studio Client: Exception: {e}")
            yield {"error": str(e)}

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
