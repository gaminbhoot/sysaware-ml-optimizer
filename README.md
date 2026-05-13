# SysAware ML Optimizer

SysAware ML Optimizer is an advanced, hardware-aware toolkit designed to dynamically profile, compress, and accelerate PyTorch models based on the host system's physical capabilities (CPU, RAM, CUDA VRAM, Apple Silicon MPS, and NPUs).

The project has recently evolved into a **distributed, real-time telemetry and benchmarking suite**. It goes beyond static optimization, offering Server-Sent Events (SSE) streaming, live UI updates, real-world LLM/SLM token-speed metrics, and fleet-wide telemetry over LAN.

## Key Features

- **Distributed Fleet Telemetry**: Multiple instances of the SysAware CLI can automatically discover and connect to a central telemetry server over the local network via UDP broadcast, posting their hardware profiles and optimization metrics.
- **Real-Time React Dashboard**: A modern React/Vite frontend consuming live Server-Sent Events (SSE) from the backend. Watch metrics update instantly as worker nodes evaluate models.
- **Inference Benchmarking (Token/sec)**: Accurately measures LLM/SLM token-generation speeds (Time-To-First-Token, Decode Speed) using real datasets.
- **Security-First Model Loading**: Mitigates arbitrary code execution vulnerabilities during serialization by strictly enforcing `torch.load(..., weights_only=True)`. Unsafe loading requires explicit flags (`--unsafe-load`).
- **Dynamic Hardware Tiering**: Algorithmic hardware assessment maps model sizes against system memory to seamlessly shift between CPU, GPU, and Apple Silicon domains.
- **RESTful API Backend & SQLite**: A high-performance FastAPI server providing endpoints for live streaming, fleet autodiscovery, and telemetry ingestion backed by a persistent SQLite database.
- **OctaWipe Streamlit GUI**: An optimized real-time interface eliminating stale state memory anomalies across continuous testing sessions, including one-click "Unload Model" memory reclamation.

---

## Installation

Ensure you are running **Python 3.9+** and have **Node.js 18+** installed for the frontend dashboard. PyTorch should be installed and configured for your specific compute hardware.

### 1. Clone the Repository
```bash
git clone https://github.com/gaminbhoot/sysaware-ml-optimizer.git
cd sysaware-ml-optimizer
```

### 2. Backend Setup (Python)
We strongly recommend using a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install all Python dependencies
pip install -r requirements.txt
```

### 3. Frontend Setup (React/Node)
Navigate to the frontend directory and install the required NPM packages:
```bash
cd frontend
npm install
```

---

## How to Interact with SysAware

The SysAware ML Optimizer provides multiple interconnected components. For the full distributed experience, run the Server, the React UI, and a CLI worker simultaneously.

### 1. Start the Telemetry Server (FastAPI)
The central hub for data ingestion, SSE streaming, and SQLite persistence.
```bash
# From the project root
python server.py
# The server will run on http://0.0.0.0:8000
# UDP Autodiscovery will also activate on port 8001
```

### 2. Start the Live Telemetry Dashboard (React)
A beautiful, responsive UI to monitor fleet telemetry and live optimization streams.
```bash
# In a new terminal, from the /frontend directory
npm run dev
# Open the dashboard at http://localhost:5173
```

### 3. Run a CLI Worker Node (`main.py`)
Run the optimizer on a model. It will use UDP autodiscovery to find the FastAPI server and stream its metrics live to the React dashboard.
```bash
# Optimize a model and broadcast metrics to the fleet
python main.py --model-path ./models/resnet50.pt --goal balanced

# If UDP autodiscovery fails across subnets, you can manually point it:
python main.py --model-path ./models/resnet50.pt --goal balanced --server http://localhost:8000
```

### 4. Interactive Sandbox GUI (`gui/app.py`)
If you want a standalone, interactive web UI to experiment with specific optimizations and prompt-engineering without joining the telemetry fleet:
```bash
streamlit run gui/app.py
```

---

## 🐳 Docker Deployment

The project is fully containerized, simplifying deployment across different environments.

### Using Docker Compose
```bash
docker-compose up --build
```
This single command spins up both the FastAPI backend and the React frontend.

---

## Developer Usage & Testing

SysAware maintains a rigorous quality standard with 200+ regression tests.

```bash
# Ensure you are in the Python virtual environment
python -m pytest -q
```

### Generating Dummy Models for Testing
If you don't have large PyTorch models locally to test with, you can use the dummy model generation scripts provided to test optimization logic:

```bash
python generate_more_dummy_models.py
```
This generates `dummy_models/optimized_model.pt` and `dummy_models/slightly_unoptimized_model.pt` which you can immediately test against the CLI runner:

```bash
python main.py --model-path dummy_models/slightly_unoptimized_model.pt --goal compress
```

## Future Enhancements (Roadmap)

- **MLOps Connectivity**: Native integration with MLflow and Weights & Biases for experiment tracking.
- **Advanced Profiling**: Implementing `torch.profiler` for deep kernel-level performance analysis.
- **Agentic AI Orchestration**: Continuing the path outlined in `planned_integrations.md`.

## License

This project is licensed under the MIT License.
