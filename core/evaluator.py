from __future__ import annotations
import time
from typing import Any, Dict, Optional
import torch
from .logging_utils import get_logger

logger = get_logger("sysaware.evaluator")

class AccuracyValidator:
    """Ensures optimization doesn't degrade model quality."""
    
    def validate_parity(self, original: Any, optimized: Any) -> Dict[str, float]:
        """
        Performs a basic parity check between original and optimized models.
        In a real scenario, this would use a small validation dataset.
        Here we use synthetic data if it's a torch module.
        """
        if not isinstance(original, torch.nn.Module) or not isinstance(optimized, torch.nn.Module):
            return {"parity_score": 1.0, "status": "skipped (not a torch module)"}

        try:
            # Always evaluate on CPU to avoid:
            # 1. MPS mixed-dtype assertion (FP32 input vs FP16 model)
            # 2. quantized::linear_dynamic not implemented on MPS
            original_cpu = original.cpu() if hasattr(original, "cpu") else original
            optimized_cpu = optimized.cpu() if hasattr(optimized, "cpu") else optimized

            # Create synthetic input based on first parameter shape
            first_param = next(original_cpu.parameters())
            if first_param.ndim < 2:
                return {"parity_score": 1.0, "status": "skipped (simple model)"}
            
            input_shape = (1,) + first_param.shape[1:]
            dummy_input = torch.randn(input_shape)  # always CPU
            
            original_cpu.eval()
            optimized_cpu.eval()
            
            with torch.no_grad():
                out_orig = original_cpu(dummy_input).float()
                out_opt = optimized_cpu(dummy_input).float()

            if not isinstance(out_orig, torch.Tensor) or not isinstance(out_opt, torch.Tensor):
                return {"parity_score": 1.0, "status": "skipped (non-tensor output)"}

            # Mean Squared Error between original and optimized output
            mse = torch.mean((out_orig - out_opt) ** 2).item()
            parity_score = max(0.0, 1.0 - mse)
            
            return {
                "parity_score": float(parity_score),
                "mse": float(mse),
                "status": "success"
            }
        except Exception as e:
            logger.warning(f"Accuracy validation failed: {e}")
            return {"parity_score": 0.0, "status": f"error: {str(e)}"}

validator = AccuracyValidator()
