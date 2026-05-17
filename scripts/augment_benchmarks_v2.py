import pandas as pd
import os
import sys

def get_bandwidth(gpu_name):
    # Manual mapping with high-fidelity data
    manual_map = {
        "RTX 5090": 1792.0,   # GDDR7, 512-bit
        "RTX 4090": 1008.0,
        "RTX 3090 Ti": 1008.0,
        "RTX 3090": 936.2,
        "RTX 4080 Super": 736.0,
        "RTX 4080": 716.8,
        "RTX 4070 Ti Super": 672.0,
        "RTX 3080 Ti": 912.4,
        "RTX 3080": 760.3,
        "RTX 4070 Ti": 504.2,
        "RTX 3070": 448.0,
        "RTX 3060": 360.0,
        "RTX 4060": 272.0,
        "GTX 1080 Ti": 484.0,
        "RTX 3060 Laptop": 192.0, # Typical 192-bit
        "RTX 4050 Laptop": 96.0,  # Typical 96-bit
        "RTX 4000 Ada": 360.0,
        "RTX 5000 Ada": 576.0,
        "RTX A6000": 768.0,
        "RTX 6000 Ada": 960.0,
        "A40": 696.0,
        "L40S": 864.0,
        "A100 PCIe": 1555.0,
        "A100 SXM": 2039.0,
        "H100 PCIe": 2000.0,
        "H100": 3350.0, # SXM5
        "A100": 1935.0,
        "Jetson AGX Orin": 204.8,
        # Apple Silicon (Unified Memory)
        "M4 Max (40-core)": 546.0,
        "M4 Pro (20-core)": 273.0,
        "M3 Max (40-core)": 400.0,
        "M3 Pro (18-core)": 150.0,
        "M2 Ultra (76-core)": 800.0,
        "M2 Max (38-core)": 400.0,
        "M2 Pro (19-core)": 200.0,
        "M1 Ultra (64-core)": 800.0,
        "M1 Max (32-core)": 400.0,
        "M1 Pro (16-core)": 200.0,
        "M1 (8-core)": 68.3,
    }
    # Try exact match
    if gpu_name in manual_map:
        return manual_map[gpu_name]
    
    # Try fuzzy/partial match for variants
    for key, val in manual_map.items():
        if key in gpu_name:
            return val
            
    return 100.0 # Default fallback

def augment(input_csv="data/benchmarks_raw_enriched.csv", output_csv="data/benchmarks_augmented_v2.csv"):
    if not os.path.exists(input_csv):
        print(f"Error: {input_csv} not found")
        return

    df = pd.read_csv(input_csv)
    df['memory_bandwidth_gbps'] = df['gpu_model'].apply(get_bandwidth)
    
    # Feature engineering
    def get_bits(quant):
        if "Q4" in quant: return 4
        if "Q2" in quant: return 2
        if "Q8" in quant: return 8
        if "F16" in quant: return 16
        return 4 # Default to Q4
    
    df['quant_bits'] = df['quantization'].apply(get_bits)
    df['model_size_gb'] = (df['model_params_b'] * df['quant_bits']) / 8
    
    # RAM Spill check (Hardware aware)
    # Note: On Apple Silicon, unified memory means spill is less of a hard cliff but still impactful.
    # We mark spill if model_size > 0.8 * VRAM (leaving room for overhead)
    df['is_ram_spill'] = (df['model_size_gb'] > (df['vram_gb'] * 0.8)).astype(int)
    
    # Add platform feature
    df['is_apple'] = df['gpu_model'].str.contains("M1|M2|M3|M4").astype(int)
    
    df.to_csv(output_csv, index=False)
    print(f"Augmented data saved to {output_csv} ({len(df)} rows)")

if __name__ == "__main__":
    in_file = sys.argv[1] if len(sys.argv) > 1 else "data/benchmarks_raw_enriched.csv"
    augment(in_file)
