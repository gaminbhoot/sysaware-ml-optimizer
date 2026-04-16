# SysAware ML Optimizer

SysAware ML Optimizer is an advanced, hardware-aware tool designed to dynamically profile, compress, and accelerate PyTorch models based on the host system's physical capabilities (CPU, RAM, CUDA VRAM, and Apple Silicon MPS). 

Whether deployed via the integrated Streamlit GUI or strictly typed through the Enterprise CLI payload formats, SysAware bridges the gap between deep learning infrastructure and production optimization—assessing latency constraints, dynamically estimating intermediate activation footprints, and autotuning INT8/FP16 models.

## Key Features

- **Security-First Model Loading**: Mitigates arbitrary code execution vulnerabilities during serialization by strictly enforcing `torch.load(..., weights_only=True)`. Legacy pickle-bound execution can only be instantiated with the explicit `--unsafe-load` flag.
- **Dynamic Hardware Tiering**: Replaces hardcoded tier rules with algorithmic checks mapping model sizes against accessible memory ratios, robustly shifting between CPU, GPU, and Apple Silicon MPS domains.
- **Comprehensive Benchmarking Mechanic**: Uses `tracemalloc` internally to measure actual intermediate tensors footprints seamlessly, cutting off benchmarks dynamically once inferences reach a tight coefficient of variance (CoV < 5%).
- **Extended INT8 Quantization**: Automatically traverses nested layer blocks and dynamically compresses structural networks including `Conv1d`, `Conv2d`, `Conv3d`, `LSTM`, and `GRU` operations alongside standard `Linear` perceptrons.
- **Intelligent Prompt Optimizer Engine**: A decoupled heuristic compiler that evaluates instruction prompts natively against `Task/Goal` dictionaries—targeting and recursively stripping semantic stop-words ("can you please", "I want you to") while restructuring the remaining text into formatted templates.
- **Fault-Tolerant CLI Envelope**: Wraps critical execution hooks inside resilient exception blocks, delivering formatted JSON packets (HTTP 500 equivalent) on runtime failure for integration via Subprocess or CI wrappers.
- **OctaWipe Streamlit Interface**: An optimized, cached, rapid user-interface eliminating stale state anomalies across continuous session executions.

## Installation

Ensure you are running **Python 3.9+** and have PyTorch configured for your specific compute hardware.

```bash
git clone https://github.com/gaminbhoot/sysaware-ml-optimizer.git
cd sysaware-ml-optimizer

# Recommended: Enable a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

## Quickstart (CLI)

SysAware exposes a centralized pipeline encompassing the entire workflow via `main.py`. 

```bash
# Run a memory-centric optimization path over a standard model
python main.py --model-path ./models/resnet50.pt --goal memory

# Return results strictly formatted as JSON (useful for backend pipelines)
python main.py --model-path ./models/transformer.pth --goal balanced --json

# Enable prompt optimization along with performance profiling
python main.py --model-path ./models/bert.pt --goal balanced \
               --optimize-prompt \
               --prompt-text "Please can you write a python script that summarizes this?" \
               --prompt-type coding

If you need to load a trusted full-module checkpoint instead of a weights-only file, use `--unsafe-load` on the CLI or the corresponding GUI toggle.
```

## Quickstart (GUI)

The interactive browser application is built natively on Streamlit.

```bash
streamlit run gui/app.py
```

## Developer Usage & Testing

SysAware enforces comprehensive coverage paths spanning the `core`, `gui`, and `cli` boundaries.

```bash
# Execute the full pytest regressions
python -m pytest

# Run isolated phases explicitly
python -m pytest tests/test_optimizer.py
python -m pytest tests/test_prompt_optimizer.py
```

## License

This project is licensed under the MIT License.
