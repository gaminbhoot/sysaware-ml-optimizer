# sysaware-ml-optimizer

> **System-Aware AI Model Optimization Engine** — Detect your hardware, analyze your PyTorch model, estimate performance, apply optimizations, and get a configuration recommendation. Includes an optional Prompt Optimizer to improve user prompts for better AI outputs.

---

## Current Status

The project is being implemented in phases. The following pieces are working now:

- System profiling (`core/system_profiler.py`)
- Model analysis (`core/model_analyzer.py`)
- Performance estimation (`core/estimator.py`)
- Prompt optimization (`core/prompt_optimizer.py`)
- Shared contracts, validation, and logging helpers

The remaining optimization modules are still in progress.


## What It Does

Most ML optimization tools assume a fixed environment. This tool doesn't. It reads *your* machine first — CPU cores, RAM, GPU availability, VRAM — and uses that context to decide what optimizations actually make sense for *your* setup.

The pipeline runs end-to-end in six stages, plus one optional prompt quality stage:

| Stage | Module | Responsibility |
|---|---|---|
| 1 | `system_profiler.py` | Detect hardware (CPU, RAM, GPU, OS) |
| 2 | `model_analyzer.py` | Extract model parameters and size |
| 3 | `estimator.py` | Estimate latency range and memory usage |
| 4 | `optimizer.py` | Apply INT8 quantization or FP16 conversion |
| 5 | `strategy_engine.py` | Rule-based config recommendation |
| 6 | `autotuner.py` | Benchmark up to 3 configs, pick the best |
| Optional | `prompt_optimizer.py` | Rewrite user prompts with better structure and clarity |

Results are displayed as **before vs. after comparisons** with latency ranges, memory usage, and a final plain-English recommendation.

## What Works Right Now

- Read your system profile from the GUI or from a one-line Python command.
- Analyze a loaded PyTorch model for parameter count and approximate size.
- Estimate performance using a static path and, when possible, a small micro-benchmark.
- Rewrite user prompts with the optional Prompt Optimizer toggle.
- Run the project test suite to verify the implemented phases.

---

## Project Structure

```
sysaware-ml-optimizer/
│
├── core/
│   ├── system_profiler.py    # Hardware detection via psutil + torch.cuda
│   ├── model_analyzer.py     # Parameter count + model size (MB)
│   ├── estimator.py          # Static estimation + micro-benchmark (5 passes)
│   ├── optimizer.py          # INT8 quantization, FP16 conversion
│   ├── strategy_engine.py    # IF/ELSE rule engine → optimization config
│   ├── autotuner.py          # Try ≤3 configs, return best by goal
│   └── prompt_optimizer.py   # Rule-based prompt rewriting + prompt quality scoring
│
├── gui/
│   └── app.py                # Streamlit frontend (includes optional prompt optimizer)
│
├── main.py                   # CLI entry point
├── tests/                    # Phase-based test suite
├── requirements.txt
├── .gitignore
└── README.md
```

---

## Goals / Optimization Modes

When running the tool, you select one of three goals:

- **Low Latency** — Minimize inference time. Prefers FP16 on GPU, torch.compile where available.
- **Low Memory** — Minimize RAM/VRAM footprint. Prefers INT8 quantization.
- **Balanced** — Trade-off between speed and memory based on available headroom.

The strategy engine uses **pure rule-based logic** (no ML, no heuristics beyond measured values) to pick the right config.

---

## Optional Prompt Optimizer

The GUI now includes a toggleable **Prompt Optimizer** feature.

- Turn **Enable Prompt Optimizer** on/off from the GUI.
- Paste any user prompt and choose a prompt type (`general`, `coding`, `analysis`, `creative`).
- Click **Optimize Prompt** to get:
  - a rewritten prompt with clearer structure,
  - quality score before/after,
  - practical suggestions for improving prompt quality.

This feature is fully **rule-based** and runs locally.

---

## Estimation Approach

The estimator runs **two methods** and reports both:

1. **Static Estimation** — Calculates memory floor from parameter count and dtype size. Fast, always available, lower confidence.
2. **Micro Benchmark** — Runs 5 forward passes on a dummy input, measures average latency and peak memory. Higher confidence, requires a runnable model.

All outputs are reported as **ranges** (e.g., `18ms – 24ms`), never false-precision single values.

---

## What It Will NOT Do

This is an MVP with hard scope limits:

- No knowledge distillation
- No structured or unstructured pruning beyond basic quantization
- No ONNX export or runtime switching
- No cloud/remote profiling
- No ML-based decision making anywhere in the pipeline
- No automatic dataset handling

---

## Requirements

- Python 3.9+
- PyTorch 2.0+
- A `.pt` or `.pth` PyTorch model file (local)

```
torch>=2.0.0
psutil>=5.9.0
streamlit>=1.32.0
```

## Quick Start on Windows

```powershell
cd D:\sysaware-ml-optimizer
.\.venv-1\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks script execution, run:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

Then activate the environment again.

---

## Installation

```bash
git clone https://github.com/gaminbhoot/sysaware-ml-optimizer.git
cd sysaware-ml-optimizer
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

On Windows with the included environment folder, use:

```powershell
& .\.venv-1\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

---

## Running

**Streamlit GUI (recommended):**
```bash
streamlit run gui/app.py
```

**CLI entry point:**
```bash
python main.py
```

**System profiler quick check:**
```bash
python -c "from core.system_profiler import get_system_profile; import json; print(json.dumps(get_system_profile(), indent=2))"
```

**Run the test suite:**
```bash
python -m pytest -q
```

---

## GUI Walkthrough

The Streamlit app has six sections:

1. **System Info** — Click *Analyze System* to read your hardware profile.
2. **Model Input** — Provide the path to a local `.pt` / `.pth` model file.
3. **Goal Selection** — Choose *Low Latency*, *Low Memory*, or *Balanced*.
4. **Prompt Optimizer (Optional)** — Toggle on, optimize user prompts, and review rewrite + suggestions.
5. **Run Optimization** — Single button executes the full model optimization pipeline.
6. **Results** — Side-by-side before/after table: latency range, memory, speed delta, final recommendation string.

The system profile section is the fastest place to verify the app is reading your local machine correctly.

---

## Verification Notes

The project includes phase-based tests for the code that is already implemented. As of now, the test suite covers:

- Shared contracts and goal constants
- Validation helpers and seed behavior
- Logger behavior and handler reuse
- CLI scaffold argument handling
- System profiling, including GPU and failure fallbacks
- Model analysis, including module-like objects and mappings
- Performance estimation, including static fallback and benchmark paths
- Prompt optimizer behavior and edge cases

Run the test suite after each phase change so regressions are caught early.

---

## Output Format (Example)

```
System: 8-core CPU | 16GB RAM | CUDA GPU (8GB VRAM) | Linux

Model: ResNet-50 | 25.6M params | 97.8 MB

Before:
  Latency : 28ms – 36ms
  Memory  : 94MB – 102MB

After (FP16, goal=low_latency):
  Latency : 14ms – 19ms   ↓ ~47%
  Memory  : 47MB – 53MB   ↓ ~50%

Recommendation: Use FP16 on GPU. Memory headroom is sufficient. Expected 2x throughput gain.
```

---

## Contributing to the project

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/your-feature`)
3. Commit with clear messages
4. Open a pull request — describe what you changed and why

---

## License

MIT License. See `LICENSE` for details.
