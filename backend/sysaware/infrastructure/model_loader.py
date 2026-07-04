import os
from pathlib import Path
from typing import Any
from sysaware.api.config import ALLOWED_MODEL_DIRS
from .logging_utils import get_logger

logger = get_logger("sysaware.infrastructure.model_loader")

def is_path_allowed(model_path: str) -> bool:
    """Check if the resolved model path falls within one of the allowed directories."""
    try:
        resolved_path = os.path.realpath(model_path)
        for allowed_dir in ALLOWED_MODEL_DIRS:
            common = os.path.commonpath([resolved_path, allowed_dir])
            if common == allowed_dir:
                return True
        return False
    except Exception:
        return False

def load_model_from_path(model_path: str, unsafe_load: bool = False) -> Any:
    """Loads a PyTorch model from a path (single file or HF-like transformers directory)."""
    path = Path(model_path)
    if not path.exists():
        raise FileNotFoundError(f"Model file or directory not found: {model_path}")

    try:
        import torch
    except Exception as exc:  # pragma: no cover
        raise RuntimeError("Torch is required to load model files") from exc

    # Handle Directory-based models (e.g., Hugging Face / Transformers / Safetensors)
    if path.is_dir():
        dir_errors = []
        try:
            from transformers import AutoModel
            # Check if it looks like a transformers model (has config.json)
            if (path / "config.json").exists():
                logger.info("Detected directory-based model. Attempting to load via transformers...")
                try:
                    # Load model (can be sharded safetensors or pytorch_model.bin)
                    model = AutoModel.from_pretrained(
                        str(path), 
                        torch_dtype="auto",
                        device_map="auto",
                        low_cpu_mem_usage=True,
                        trust_remote_code=unsafe_load
                    )
                    return model
                except Exception as transformer_exc:
                    msg = f"Transformers load failed: {transformer_exc}"
                    logger.warning(msg)
                    dir_errors.append(msg)
        except ImportError:
            logger.warning("Transformers not installed. Unable to load directory as AutoModel.")

        # Fallback: Treat directory as a collection of state_dicts
        st_files = list(path.glob("*.safetensors"))
        if st_files:
            try:
                from safetensors.torch import load_file
                combined_state_dict = {}
                for st_file in st_files:
                    combined_state_dict.update(load_file(str(st_file), device="cpu"))
                return combined_state_dict
            except Exception as st_exc:
                msg = f"Safetensors load failed: {st_exc}"
                logger.warning(msg)
                dir_errors.append(msg)

        # If we are here, it means it is a directory but all our loaders failed.
        # Do NOT fall through to torch.load() which will raise IsADirectoryError.
        error_details = "\n- ".join(dir_errors)
        raise RuntimeError(
            f"Failed to load model directory '{model_path}'. All directory-based loaders failed:\n- {error_details}\n\n"
            "Ensure the directory contains a valid config.json and model weights (safetensors or .bin). "
            "If this model requires custom code, try again with --unsafe-load."
        )

    # Handle single Safetensors file
    if path.suffix == ".safetensors":
        try:
            from safetensors.torch import load_file
            return load_file(str(path), device="cpu")
        except Exception as exc:
            raise RuntimeError(f"Failed to load safetensors file '{model_path}': {exc}") from exc

    # Standard PyTorch load
    try:
        return torch.load(str(path), map_location="cpu", weights_only=not unsafe_load)
    except Exception as exc:
        if unsafe_load:
            raise RuntimeError(f"Failed to load model '{model_path}' with unsafe_load enabled: {exc}") from exc
        raise RuntimeError(
            f"Failed to load model '{model_path}' with weights_only=True: {exc}. "
            "If this is a full-module checkpoint, retry with --unsafe-load or use the GUI unsafe-load option. "
            "If it is a state_dict or directory-based model, use appropriate format."
        ) from exc
