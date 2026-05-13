# SysAware ML Optimizer

> A distributed, hardware-aware toolset designed to dynamically profile, compress, and accelerate PyTorch models based on physical hardware capabilities across CPU, GPU, Apple Silicon (MPS), and NPUs.

SysAware ML Optimizer acts as a real-time telemetry and benchmarking suite. By automatically adjusting to your system capabilities, evaluating token-generation metrics, and syncing via Server-Sent Events (SSE) to a modern dashboard, it elevates static model optimization into a fully observable network orchestration.

---

## ✨ Features

- **Distributed Telemetry & Autodiscovery:** Worker nodes automatically discover and connect to a central server via UDP broadcast to stream telemetry across the LAN.
- **Hardware-Aware Autotuning:** Algorithms dynamically match model requirements with system compute, seamlessly transitioning between CPU, GPU, and Apple Silicon.
- **Real-Time React Dashboard:** A fast Vite+React frontend visualizes live Server-Sent Events (SSE) directly from worker nodes.
- **Live Inference Benchmarking:** Measures Time-To-First-Token, Decode Speed, and memory performance under real datasets.
- **Strict Security Boundaries:** Forces `torch.load(weights_only=True)` by default to prevent arbitrary code execution during serialization.
- **FastAPI backend & SQLite:** High-performance, lightweight telemetry ingestion backed by persistent local storage.
- **Interactive TUI:** Beautiful terminal interface (Rich) for dynamic, local optimization tracking.

---

## 🚀 Quickstart (Docker)

The fastest way to get started is by spinning up the backend and frontend simultaneously via Docker Compose:

```bash
git clone https://github.com/gaminbhoot/sysaware-ml-optimizer.git
cd sysaware-ml-optimizer
docker-compose up --build
```
- **React Frontend:** `http://localhost:5173`
- **FastAPI Backend:** `http://localhost:8000`

---

## 🛠️ Local Installation & Usage

Ensure you have **Python 3.9+** and **Node.js 18+** installed. 

### 1. Set up the Core & Telemetry Server 
The telemetry server ingests logs, streams updates, and manages SQLite persistence.

```bash
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start the Telemetry Hub (Rest API & UDP Autodiscovery)
python server.py
```

### 2. Set up the React Dashboard
Monitor the optimization streams via the real-time UI. In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

### 3. Run a SysAware Worker Node
Optimize a model locally. The node will automatically discover the telemetry server.

```bash
source venv/bin/activate

# Optional: Generate some dummy models for testing
python generate_more_dummy_models.py

# Run the TUI optimization workflow
python main.py --model-path dummy_models/slightly_unoptimized_model.pt --goal compress
```

---

## 🧪 Testing

SysAware enforces high code quality through a comprehensive test suite. 

```bash
pytest -v
```

## 📜 License
Distributed under the MIT License.
