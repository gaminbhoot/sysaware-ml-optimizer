# SysAware ML Optimizer - Implementation Roadmap

This document serves as the **Master State Record** for the project's evolution from a high-fidelity prototype to a production-grade optimization suite. Use this to restore context during session transitions or memory compression.

---

## 🛰️ Project Status Overview
- **Current Phase:** Phase 3 (Refinement)
- **Status:** ✅ Completed (Operational Logic Hardened)
- **Last Update:** 2026-05-12
- **Lead Engineer:** Lead Implementation Engineer (Gemini CLI)

---

## 🏗️ The Master Plan

### Phase 1: Foundations (Data Integrity & Safety) [DONE]
**Objective:** Hardening the core logic and persistence layer to prevent data corruption and system crashes.
- [x] **Model Fingerprinting:** Implement SHA-256 hashing for model weight identification (`core/utils.py`).
- [x] **DB WAL Mode:** Enable Write-Ahead Logging in SQLite for high-concurrency fleet telemetry (`core/store.py`).
- [x] **OOM Safeguards:** Implement memory headroom checks before expensive benchmarks (`core/benchmark.py`).
- [x] **Schema Evolution:** Update DB and API schemas to support `model_hash` and `last_seen` heartbeats.

### Phase 2: Expansion (Operational Logic) [DONE]
**Objective:** Adding high-value features for fleet management and performance optimization.
- [x] **Node Heartbeat Service:** 30s background pulses to track node "Online/Offline" status.
- [x] **Strategy Memoization:** Cache benchmark results locally to skip redundant LLM profiling.
- [x] **The Blacklist Engine:** Automated tracking and synchronization of (Hardware + Backend) crash points (e.g., MPS + INT8 issues).
- [x] **Secure Network Autodiscovery:** UDP beaconing with dual-approval (CLI + Dashboard) join requests.

### Phase 3: Refinement (Power Features & Automation) [IN PROGRESS]
**Objective:** Professionalizing the user experience and deployment pipeline.
- [ ] **Interactive TUI CLI:** A "Rich" text-based UI for real-time local optimization control.
- [ ] **Export-to-Deploy Pipeline:** Generate Dockerfiles/Systemd units from optimized strategies.
- [ ] **Virtual Hardware Simulator:** Predict performance for hardware not currently in the fleet.

---

## 📝 Implementation Log

| Date | Phase | Task | Note |
| :--- | :--- | :--- | :--- |
| 2026-05-12 | Phase 1 | Roadmap Created | Established tracking file for session persistence. |
| 2026-05-12 | Phase 1 | Code Drafted | Designed Hashing, WAL, and OOM logic. |

---

## 🧬 Context Recovery Block (FOR LLM RESTORATION)
> **STATE SNAPSHOT:** Phase 1 Foundations.
> **GOAL:** Transitioning to production-grade telemetry.
> **PENDING ACTIONS:** Apply drafted Phase 1 code (Hashing, WAL mode, OOM checks).
> **ACTIVE FILES:** `core/utils.py`, `core/store.py`, `core/benchmark.py`, `server.py`, `main.py`.
> **ARCHITECTURE:** Central FastAPI server (8000), SQLite WAL mode, SSE-based Fleet Dashboard.
