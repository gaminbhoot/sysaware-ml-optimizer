import pandas as pd
import dbgpu
import os

def get_bandwidth(gpu_name):
    # Manual mapping for common ones
    manual_map = {
        "RTX 3070": 448.0,
        "RTX 3080": 760.3,
        "RTX 3080 Ti": 912.4,
        "RTX 4070 Ti": 504.2,
        "RTX 4080": 716.8,
        "RTX 3090": 936.2,
        "RTX 4090": 1008.0,
        "RTX 4000 Ada": 360.0,
        "RTX 5000 Ada": 576.0,
        "RTX A6000": 768.0,
        "RTX 6000 Ada": 960.0,
        "A40": 696.0,
        "L40S": 864.0,
        "A100 PCIe": 1555.0,
        "A100 SXM": 2039.0,
        "H100 PCIe": 2000.0,
        "M1 (7-Core)": 68.3,
        "M1 Max (32-Core)": 400.0,
        "M2 Ultra (76-Core)": 800.0,
        "M3 Max (40-Core)": 400.0
    }
    return manual_map.get(gpu_name, 100.0) # Default to 100 if unknown

def augment():
    csv_path = "data/benchmarks_raw.csv"
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return

    df = pd.read_csv(csv_path)
    df['memory_bandwidth_gbps'] = df['gpu_model'].apply(get_bandwidth)
    
    # Feature engineering
    # Model size estimate (B params * bits / 8)
    def get_bits(quant):
        if "Q4" in quant: return 4
        if "F16" in quant: return 16
        return 8
    
    df['quant_bits'] = df['quantization'].apply(get_bits)
    df['model_size_gb'] = (df['model_params_b'] * df['quant_bits']) / 8
    
    # RAM Spill check (Simulated: if model_size > vram)
    df['is_ram_spill'] = (df['model_size_gb'] > df['vram_gb']).astype(int)
    
    output_path = "data/benchmarks_augmented.csv"
    df.to_csv(output_path, index=False)
    print(f"Augmented data saved to {output_path}")

if __name__ == "__main__":
    augment()
