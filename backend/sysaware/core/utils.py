import hashlib
import os

def calculate_model_hash(model_path: str, chunk_size: int = 1024 * 1024) -> str:
    """
    Generates a SHA-256 hash of the model file. 
    Used as a fingerprint to ensure benchmarks are uniquely mapped to specific weights.
    Reads in chunks to maintain low memory footprint even for multi-GB models.
    """
    if not model_path or not os.path.exists(model_path):
        return "unknown"
    
    sha256_hash = hashlib.sha256()
    try:
        with open(model_path, "rb") as f:
            for byte_block in iter(lambda: f.read(chunk_size), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception:
        return "error_calculating_hash"
