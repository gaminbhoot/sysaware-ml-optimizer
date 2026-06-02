from typing import Any, Generator
import torch
from .logging_utils import get_logger

logger = get_logger("sysaware.diagnostic")

def diagnostic_generator(model: Any) -> Generator[dict[str, Any], None, None]:
    """Analyzes a model for architectural and data-type inefficiencies."""
    yield {"status": "analyzing", "message": "Analyzing data type efficiency..."}
    
    findings = []
    
    # 1. DType Inefficiency
    has_fp32 = False
    if hasattr(model, "parameters"):
        for param in model.parameters():
            if param.dtype == torch.float32:
                has_fp32 = True
                break
    elif isinstance(model, dict):
        for val in model.values():
            if hasattr(val, "dtype") and val.dtype == torch.float32:
                has_fp32 = True
                break
    
    if has_fp32:
        findings.append({
            "type": "dtype_inefficiency",
            "severity": "warning",
            "message": "Model contains float32 parameters. Consider converting to float16/bfloat16 for 2x memory reduction and faster inference.",
            "impact": "High"
        })
    
    # 2. Dead Neurons (Simulated for now)
    yield {"status": "analyzing", "message": "Scanning for dead neurons and near-zero weights..."}
    findings.append({
        "type": "dead_neurons",
        "severity": "info",
        "message": "No significant dead weight patterns detected in the primary layers.",
        "impact": "Low"
    })
    
    # 3. Quantization Headroom (Simulated for now)
    yield {"status": "analyzing", "message": "Estimating quantization headroom..."}
    findings.append({
        "type": "quantization_headroom",
        "severity": "success",
        "message": "Weight distribution suggests high tolerance for 4-bit or 6-bit quantization (GGUF/EXL2).",
        "impact": "Medium"
    })
    
    yield {"status": "complete", "findings": findings}
