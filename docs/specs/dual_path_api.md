# Spec: Dual-Path Diagnostic & Tuning API

This spec defines the requirements for the new dual-path API endpoints in the SysAware ML Optimizer backend.

## 1. Path A: Custom Model Diagnostic Engine
**Endpoint:** `POST /api/diagnose/custom/stream`
**Purpose:** Analyze raw model weights (e.g., `.pt`, `.safetensors`) for architectural and data-type inefficiencies.

### Acceptance Criteria (AC)
1. **AC-A1:** Accepts `model_path` (string) and `unsafe_load` (boolean).
2. **AC-A2:** Returns a `StreamingResponse` (SSE).
3. **AC-A3:** Yields progress updates with `status: "analyzing"`.
4. **AC-A4:** Yields specific diagnostic findings:
    - `dtype_inefficiency`: Detection of high-precision types where low-precision would suffice.
    - `dead_neurons`: Detection of layers with near-zero activations/weights.
    - `quantization_headroom`: Estimate of how much precision can be lost without accuracy drop.
5. **AC-A5:** Handles file not found or load errors by yielding `status: "error"`.

## 2. Path B: Runtime Tuner
**Endpoint:** `POST /api/tune/runtime/stream`
**Purpose:** Benchmarking and optimizing runtime parameters for pre-built models (LM Studio, Ollama).

### Acceptance Criteria (AC)
1. **AC-B1:** Accepts `model_id` (string), `source` (enum: "lms", "ollama", "olx"), and `system_profile` (dict).
2. **AC-B2:** Returns a `StreamingResponse` (SSE).
3. **AC-B3:** Yields progress updates for:
    - `context_length`: Max context calculation.
    - `layer_split`: Optimal GPU/CPU split.
    - `concurrency`: Throughput at different concurrency levels.
4. **AC-B4:** Yields `thermal_throttling` data if detected during sustained runs.

## 3. Inference Estimator
**Endpoint:** `POST /api/estimate/inference`
**Purpose:** Predict tok/s using trained regression models.

### Acceptance Criteria (AC)
1. **AC-C1:** Accepts `hardware_specs` (dict) and `model_metadata` (dict).
2. **AC-C2:** Returns a JSON object with `predicted_tok_s` and `confidence_interval`.
3. **AC-C3:** Uses the Two-Regressor architecture (In-VRAM vs. RAM-Spill).
