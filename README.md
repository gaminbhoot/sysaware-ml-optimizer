# SysAware ML Optimizer

> A distributed, hardware-aware ecosystem designed to dynamically profile, diagnose, and accelerate LLMs based on physical hardware capabilities across CPU, GPU, Apple Silicon (MPS), and NPUs.

SysAware ML Optimizer has evolved from a single-machine profiling engine into a **comprehensive, dual-path diagnostic and runtime tuning suite**. By bridging the gap between raw weights and runtime backends, it provides actionable architectural insights and precise performance estimations for both custom and pre-built models.

---

## ⚡ The Dual-Path Architecture

SysAware now orchestrates two distinct optimization journeys:

### 🛠️ Path A: Model Diagnostic (Custom Models)
Designed for researchers and fine-tuners working with raw checkpoints (`.pt`, `.safetensors`).
*   **Deep Architectural Scan**: Identifies `dtype` inefficiencies (FP32 where FP16 suffices) and disproportional parameter distribution.
*   **Health Mapping**: Detects "dead neurons" from near-zero activations and calculates weight-redundancy across layers.
*   **Quantization Headroom**: Predicts the maximum quantization threshold (e.g., 4-bit vs 8-bit) before significant accuracy degradation.

### ⚙️ Path B: Parameter Tuner (Pre-built Models)
Designed for users running models via runtime backends like **LM Studio**, **Ollama**, or **OLX**.
*   **VRAM Split Optimization**: Calculates the mathematically optimal GPU/CPU layer split based on available VRAM headroom.
*   **Context Bound Discovery**: Empirically derives the exact maximum context length your hardware can sustain without spilling to RAM.
*   **Concurrency Benchmarking**: Identifies the "throughput ceiling" by stress-testing the model under multiple parallel requests.

---

## ✨ Key Features

- **🧠 Inference Estimator**: Predict tokens-per-second (tok/s) before loading a model. Powered by a **RandomForest Regressor** trained on community benchmarks and lab-measured ground truth, specifically optimized for Apple Silicon and RAM-spill conditions.
- **💬 Prompt Engine Laboratory**: A dual-purpose workspace to restructure prompts for token-efficiency in the **Prompt Lab**, and immediately test them in a **Live Chat** interface connected to your backend LLM.
- **🛰️ Distributed Telemetry**: Unified **Fleet Dashboard** to monitor multiple inference nodes across a LAN using UDP autodiscovery and SSE (Server-Sent Events).
- **🎨 Cinematic Model Hub**: A premium, stateful UI for model orchestration, featuring live progress tracking for long-running diagnostic and tuning sessions.
- **🛡️ Secure Ingest**: Enforces strict security boundaries with verified safetensors support and optional unsafe-load flags for legacy checkpoints.

---

## 📁 Project Structure

```text
sysaware-ml-optimizer/
├── backend/                # FastAPI server and core logic
│   ├── core/               # Diagnostic, Tuning, and ML modules
│   │   ├── diagnostic.py   # Path A logic
│   │   ├── tuner.py        # Path B logic
│   │   ├── estimator.py    # tok/s prediction engine
│   │   └── lmstudio.py     # Live bridge/proxy
│   ├── server.py           # Central API & Telemetry hub
│   └── main.py             # CLI worker entry point
├── frontend/               # Vite + React (TypeScript) dashboard
├── data/                   # ML models, benchmark CSVs, and SQLite DB
├── scripts/                # Data augmentation and training pipelines
├── docs/                   # Architectural plans and evolution roadmap
├── tests/                  # Comprehensive Pytest & Playwright E2E suite
└── venv/                   # Local Python environment
```

---

## 🚀 Quickstart

Ensure you have **Python 3.14+** and **Node.js 18+** installed.

### 1. Initialize the Backend
The server handles diagnostics, proxied chat, and telemetry.

```bash
# From the root directory
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the Hub (Default: http://localhost:8000)
export PYTHONPATH=$PYTHONPATH:.
python backend/server.py
```

### 2. Launch the Model Hub
Monitor and tune your models via the cinematic dashboard.

```bash
cd frontend
npm install
npm run dev
```

### 3. Training the Estimator (Optional)
To update the inference predictor with the latest benchmarks:

```bash
# Scrape latest data and train the RandomForest models
python scripts/augment_benchmarks_v2.py
python scripts/train_estimator_v2.py
```

---

## 🧪 Testing & Validation

SysAware enforces high code quality through a dual-layered test suite:

*   **Backend (Pytest)**: `pytest tests/test_dual_path_api.py`
*   **Frontend (Playwright)**: `npx playwright test`

## 📜 License
Distributed under the MIT License.
