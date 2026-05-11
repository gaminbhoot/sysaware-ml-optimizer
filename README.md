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
- **RESTful API Backend**: A high-performance FastAPI server providing programmatic access to system profiling, model analysis, and prompt optimization endpoints.

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

## Usage

SysAware provides three primary interfaces for interaction.

### 1. Enterprise CLI (`main.py`)
The centralized pipeline for model analysis and optimization.

```bash
# Run memory optimization and return JSON results
python main.py --model-path ./models/resnet50.pt --goal memory --json

# Optimize a prompt with intent hints
python main.py --model-path ./models/bert.pt --optimize-prompt \
               --prompt-text "Please summarize this code." --prompt-type coding
```

### 2. Interactive GUI (`gui/app.py`)
A polished Streamlit application for real-time visualization of hardware-aware optimizations.

```bash
streamlit run gui/app.py
```

### 3. REST API (`server.py`)
Deploy the optimizer as a microservice using FastAPI.

```bash
python server.py
# API documentation available at http://localhost:8000/docs
```

## Developer Usage & Testing

SysAware maintains a rigorous quality standard with comprehensive test coverage.

```bash
# Execute the full suite of 200+ regression tests
export PYTHONPATH=.
pytest tests/
```

## Future Enhancements (Roadmap)

- **Safetensors Integration**: Transition from pickle-based `.pt` files to `safetensors` for inherently secure, zero-code-execution model loading.
- **MLOps Connectivity**: Native integration with MLflow and Weights & Biases for experiment tracking and optimization logging.
- **Dockerization**: Containerize the FastAPI and Streamlit services for seamless cloud deployment via Kubernetes or GCP/AWS.
- **Advanced Profiling**: Implementation of `torch.profiler` for deeper kernel-level performance analysis during benchmarks.

## License

This project is licensed under the MIT License.
