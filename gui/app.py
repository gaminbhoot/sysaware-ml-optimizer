import streamlit as st  # type: ignore[import-not-found]
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.contracts import GOALS, GOAL_LABELS
from core.system_profiler import get_system_profile
from core.model_analyzer import analyze_model
from core.prompt_optimizer import optimize_prompt
from core.estimator import estimate_performance
from core.strategy_engine import get_strategy
from core.autotuner import autotune
from main import load_model_from_path

from gui.helpers import clear_pipeline_state, format_range, format_memory, format_gpu_name, has_required_inputs

# ── Page config ───────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="SysAware ML Optimizer",
    page_icon="⚙",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# ── Inject OctaWipe-style CSS (Orbitron + Fira Code, dark grid, cyan accents) ─
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Overpass:wght@400;600;700;800&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');

:root {
    --bg:        #000000;
    --surface:   rgba(0, 0, 0, 0.3);
    --border:    rgba(255, 255, 255, 0.25);
    --accent:    #ffffff;
    --accent2:   #f0f0f0;
    --muted:     #111111;
    --text:      #ffffff;
    --text-dim:  rgba(255, 255, 255, 0.7);
    --danger:    #ef5350;
    --warn:      #ffb300;
}

html, body, [class*="css"] {
    font-family: 'Overpass', sans-serif !important;
    background-color: var(--bg) !important;
    color: var(--text) !important;
}

.stApp {
    background-color: var(--bg) !important;
}

.main .block-container {
    padding: 3rem 4rem !important;
    max-width: 1200px !important;
}

.octa-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--border);
    padding-bottom: 2.5rem;
    margin-bottom: 3rem;
    text-align: center;
    position: relative;
    padding-top: 1rem;
}
.octa-logo {
    font-family: 'Playfair Display', serif;
    font-size: 5rem;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: -1px;
    text-transform: lowercase;
    line-height: 1;
}
.octa-sub {
    font-family: 'Overpass', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-dim);
    letter-spacing: 0.1em;
    text-transform: lowercase;
    margin-top: 0.5rem;
}
.octa-badge {
    display: none;
}

.octa-section {
    font-family: 'Overpass', sans-serif;
    font-size: 1.1rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--accent);
    text-transform: lowercase;
    border-bottom: 1px solid var(--border);
    padding-bottom: 0.5rem;
    margin-bottom: 1.5rem;
    margin-top: 3rem;
    border-left: none;
    padding-left: 0;
}

.octa-card {
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 1.5rem 2rem;
    margin-bottom: 1.5rem;
    font-size: 1rem;
}
.octa-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid rgba(255,255,255,0.1);
}
.octa-card-row:last-child { border-bottom: none; }
.octa-key   { color: var(--text-dim); font-size: 0.9rem; letter-spacing: 0.05em; font-weight: 400; text-transform: lowercase; }
.octa-val   { color: var(--accent); font-family: 'Overpass', sans-serif; font-size: 1rem; font-weight: 700; }
.octa-val-ok  { color: var(--accent); }
.octa-val-bad { color: var(--danger); font-weight: 600; }

.octa-stat-grid {
    display: flex;
    gap: 10px;
    margin-bottom: 1rem;
}
.octa-stat {
    background: var(--bg);
    border: 1px solid var(--border);
    padding: 1.5rem 1rem;
    text-align: center;
    flex: 1;
}
.octa-stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent);
    display: block;
}
.octa-stat-label {
    font-family: 'Overpass', sans-serif;
    font-size: 0.8rem;
    color: var(--text-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 6px;
    display: block;
    font-weight: 600;
}

.octa-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; margin-top: 0.5rem; }
.octa-table th {
    font-family: 'Overpass', sans-serif;
    font-size: 0.7rem;
    letter-spacing: 0.15em;
    color: var(--text-dim);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    padding: 8px 10px;
    text-align: left;
    font-weight: 700;
}
.octa-table td { padding: 12px 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-family: 'Overpass', sans-serif; color: var(--text); }
.octa-table tr:hover td { background: rgba(255,255,255,0.02); }
.delta-good { color: var(--accent); font-weight: 700; }
.delta-bad  { color: var(--danger); }

.stButton > button {
    font-family: 'Overpass', sans-serif !important;
    font-size: 0.85rem !important;
    font-weight: 700 !important;
    letter-spacing: 0.2rem !important;
    text-transform: uppercase !important;
    background: rgba(0, 0, 0, 0.3) !important;
    color: var(--accent) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    padding: 1rem 2rem !important;
    transition: background 0.3s ease, border 0.3s ease !important;
    width: auto !important;
    display: inline-flex !important;
    justify-content: center !important;
    margin-top: 0.5rem !important;
}
.stButton > button:hover { background: var(--accent) !important; border-color: var(--accent) !important; color: #000 !important; }
.stButton > button:active { transform: scale(0.98) !important; }

.stSelectbox > div > div,
.stTextInput > div > div > input,
.stTextArea > div > div > textarea {
    background: transparent !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    color: var(--text) !important;
    font-family: 'Overpass', sans-serif !important;
    padding: 0.8rem !important;
}
.stSelectbox label, .stTextInput label, .stRadio label, .stTextArea label, .stCheckbox label {
    font-family: 'Overpass', sans-serif !important;
    font-size: 0.75rem !important;
    font-weight: 600 !important;
    letter-spacing: 0.1rem !important;
    text-transform: uppercase !important;
    color: var(--text-dim) !important;
}
.stRadio > div > label {
    font-family: 'Overpass', sans-serif !important;
    font-size: 0.8rem !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    color: var(--text) !important;
    background: transparent !important;
    border: 1px solid var(--border) !important;
    padding: 10px 20px !important;
    cursor: pointer !important;
    border-radius: 0 !important;
    min-width: 120px !important;
    text-align: center !important;
    display: inline-flex !important;
    justify-content: center !important;
}
.stRadio > div { flex-wrap: wrap; gap: 10px; }
.stRadio > div > label:has(input:checked) { border-color: var(--accent) !important; background: var(--accent) !important; color: #000 !important; }

.stAlert { border-radius: 0 !important; border: 1px solid var(--border) !important; border-left: 3px solid var(--accent) !important; background: rgba(0,0,0,0.5) !important; font-family: 'Overpass', sans-serif !important; font-size: 0.9rem !important; }
hr { border-color: var(--border) !important; margin: 3rem 0 !important; }

[data-testid="stMetricValue"] { font-family: 'Playfair Display', serif !important; color: var(--accent) !important; font-size: 2.2rem !important; font-weight: 700 !important; }
[data-testid="stMetricLabel"] { font-family: 'Overpass', sans-serif !important; font-size: 0.8rem !important; font-weight: 600 !important; letter-spacing: 0.15rem !important; text-transform: uppercase !important; color: var(--text-dim) !important; }

[data-testid="stSidebar"] { background: var(--bg) !important; border-right: 1px solid var(--border) !important; }

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: #333; }
::-webkit-scrollbar-thumb:hover { background: #666; }
</style>
""", unsafe_allow_html=True)


# ── Header ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="octa-header">
    <div>
        <div class="octa-logo">⚙ SysAware</div>
        <div class="octa-sub">ML Model Optimization Engine</div>
    </div>
    <div class="octa-badge">MVP v0.1</div>
</div>
""", unsafe_allow_html=True)


# ── 3-column layout ────────────────────────────────────────────────────────────
col_left, col_mid, col_right = st.columns([1.1, 1.3, 1.6], gap="large")


# ═══════════════════════════════════════════════════════════════════════════════
# COL 1 — System Info + Model Input
# ═══════════════════════════════════════════════════════════════════════════════
with col_left:

    if st.button("↺ Reset Session", key="btn_reset"):
        clear_pipeline_state(st.session_state)
        st.success("Session cleared.")
        st.rerun()

    st.markdown('<div class="octa-section">01 / System Profile</div>', unsafe_allow_html=True)

    if st.button("▶  Analyze System", key="btn_system"):
        with st.spinner("Scanning hardware..."):
            try:
                profile = get_system_profile()
                st.session_state["system_profile"] = profile
                st.success("System profile captured.")
            except Exception as exc:
                st.error(f"System scan failed: {exc}")

    if "system_profile" in st.session_state:
        p = st.session_state["system_profile"]
        
        dgpu_name = p.get("dgpu_name", "None")
        dgpu_gb   = p.get("dgpu_vram_gb", 0.0)
        dgpu_val  = f"{format_gpu_name(dgpu_name)} ({dgpu_gb:.1f} GB)" if dgpu_name != "None" else "None"
        dgpu_class = "octa-val-ok" if dgpu_name != "None" else "octa-val-bad"

        igpu_name = p.get("igpu_name", "None")
        igpu_gb   = p.get("igpu_vram_gb", 0.0)
        igpu_val  = f"{format_gpu_name(igpu_name)} ({igpu_gb:.1f} GB)" if igpu_name != "None" else "None"
        igpu_class = "octa-val-ok" if igpu_name != "None" else "octa-val-bad"

        npu_avail = p.get("npu_available", False)
        npu_name  = p.get("npu_name", "None")
        npu_val   = npu_name if npu_avail else "Not Detected"
        npu_class = "octa-val-ok" if npu_avail else "octa-val-bad"
        
        st.markdown(f"""
        <div class="octa-card">
            <div class="octa-card-row"><span class="octa-key">OS</span><span class="octa-val">{p.get('os','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">CPU Cores</span><span class="octa-val">{p.get('cpu_cores','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">RAM</span><span class="octa-val">{p.get('ram_gb',0):.1f} GB</span></div>
            <div class="octa-card-row"><span class="octa-key">dGPU</span><span class="{dgpu_class}">{dgpu_val}</span></div>
            <div class="octa-card-row"><span class="octa-key">iGPU</span><span class="{igpu_class}">{igpu_val}</span></div>
            <div class="octa-card-row"><span class="octa-key">NPU</span><span class="{npu_class}">{npu_val}</span></div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown('<div class="octa-card" style="color:#2a2a2a;font-size:0.75rem;text-align:center;padding:2rem;">[ awaiting scan ]</div>', unsafe_allow_html=True)

    st.markdown('<div class="octa-section">02 / Model Input</div>', unsafe_allow_html=True)

    def on_model_path_change():
        if "model_analysis" in st.session_state:
            del st.session_state["model_analysis"]
        if "model" in st.session_state:
            del st.session_state["model"]

    model_path = st.text_input("Model path (.pt / .pth)", placeholder="e.g. /models/resnet50.pt", on_change=on_model_path_change)
    unsafe_load = st.checkbox("Unsafe load (advanced)", value=False, help="Allow full-module checkpoints that require unpickling. Only enable for trusted files.")

    if st.button("▶  Load Model", key="btn_load") and model_path:
        with st.spinner("Analyzing model..."):
            try:
                model = load_model_from_path(model_path, unsafe_load=unsafe_load)
                analysis = analyze_model(model)
                st.session_state["model"] = model
                st.session_state["model_analysis"] = analysis
                st.success("Model loaded and analyzed.")
            except Exception as e:
                st.error(f"Load failed: {e}")

    if "model_analysis" in st.session_state:
        a = st.session_state["model_analysis"]
        st.markdown(f"""
        <div class="octa-card">
            <div class="octa-card-row"><span class="octa-key">Parameters</span><span class="octa-val">{a.get('num_params',0):,}</span></div>
            <div class="octa-card-row"><span class="octa-key">Size</span><span class="octa-val">{format_memory(a.get('size_mb',0))}</span></div>
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# COL 2 — Goal + Run + Strategy
# ═══════════════════════════════════════════════════════════════════════════════
with col_mid:

    st.markdown('<div class="octa-section">03 / Optimization Goal</div>', unsafe_allow_html=True)

    goal = st.radio(
        "goal",
        options=list(GOALS),
        format_func=lambda x: GOAL_LABELS[x],
        label_visibility="collapsed",
    )
    st.session_state["goal"] = goal

    st.markdown('<div class="octa-section">03.5 / Prompt Optimizer (Optional)</div>', unsafe_allow_html=True)

    enable_prompt_optimizer = st.toggle(
        "Enable Prompt Optimizer",
        value=st.session_state.get("enable_prompt_optimizer", False),
        key="enable_prompt_optimizer",
    )

    if enable_prompt_optimizer:
        prompt_intent = st.selectbox(
            "Prompt Type",
            options=["general", "coding", "analysis", "creative"],
            key="prompt_intent",
        )
        user_prompt_input = st.text_area(
            "User Prompt",
            height=120,
            placeholder="Paste your prompt here to get a clearer, higher-quality rewrite.",
            key="prompt_input",
        )

        if st.button("▶  Optimize Prompt", key="btn_optimize_prompt"):
            result = optimize_prompt(user_prompt_input, prompt_intent)
            st.session_state["prompt_optimizer_result"] = result

        if "prompt_optimizer_result" in st.session_state:
            po = st.session_state["prompt_optimizer_result"]
            st.markdown(f"""
            <div class="octa-card">
                <div class="octa-card-row"><span class="octa-key">Prompt Score (Before)</span><span class="octa-val">{po.get('before_score', 0)} / 100</span></div>
                <div class="octa-card-row"><span class="octa-key">Prompt Score (After)</span><span class="octa-val octa-val-ok">{po.get('after_score', 0)} / 100</span></div>
            </div>
            """, unsafe_allow_html=True)

            st.markdown("**Optimized Prompt**")
            st.text_area("optimized_prompt", value=po.get("optimized_prompt", ""), height=170, label_visibility="collapsed")

            st.markdown("**Improvement Suggestions**")
            for tip in po.get("suggestions", []):
                st.markdown(f"- {tip}")

    st.markdown('<div class="octa-section">04 / Execute Pipeline</div>', unsafe_allow_html=True)

    ready = has_required_inputs(st.session_state)
    if not ready:
        st.markdown('<div style="font-size:0.72rem;color:#2a2a2a;border:1px solid #1a1a1a;padding:0.8rem;font-family:\'Fira Code\',monospace;margin-bottom:1rem;">⚠ complete steps 01 and 02 first</div>', unsafe_allow_html=True)

    if st.button("▶▶  Run Optimization", key="btn_run", disabled=not ready):
        try:
            model   = st.session_state["model"]
            profile = st.session_state["system_profile"]
            goal_v  = st.session_state["goal"]

            with st.spinner("Estimating baseline..."):
                baseline = estimate_performance(model, profile)
                st.session_state["baseline"] = baseline
            with st.spinner("Generating strategy..."):
                strategy = get_strategy(profile, goal_v, st.session_state.get("model_analysis"))
                st.session_state["strategy"] = strategy
            with st.spinner("Autotuning configs..."):
                best_config, best_model, best_result = autotune(model, profile, goal_v)
                st.session_state["best_config"] = best_config
                st.session_state["best_model"]  = best_model
                st.session_state["best_result"] = best_result
            st.success("Pipeline complete.")
        except Exception as exc:
            st.error(f"Optimization pipeline failed: {exc}")

    if "strategy" in st.session_state:
        s = st.session_state["strategy"]
        st.markdown('<div class="octa-section" style="margin-top:1.5rem;">Strategy</div>', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="octa-card">
            <div class="octa-card-row"><span class="octa-key">Optimization</span><span class="octa-val">{s.get('optimization','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">Device</span><span class="octa-val">{s.get('device','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">Rationale</span><span class="octa-val" style="font-size:0.7rem;color:#aaa;">{s.get('rationale','—')}</span></div>
        </div>
        """, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# COL 3 — Results
# ═══════════════════════════════════════════════════════════════════════════════
with col_right:

    st.markdown('<div class="octa-section">05 / Results</div>', unsafe_allow_html=True)

    if "baseline" in st.session_state and "best_result" in st.session_state:
        b   = st.session_state["baseline"]
        r   = st.session_state["best_result"]
        cfg = st.session_state.get("best_config", "—")

        lat_b_lo, lat_b_hi = b.get("latency_range_ms", (0, 0))
        lat_r_lo, lat_r_hi = r.get("latency_range_ms", (0, 0))
        mem_b = b.get("memory_mb", 0)
        mem_r = r.get("memory_mb", 0)
        lat_delta = ((lat_r_hi - lat_b_hi) / lat_b_hi * 100) if lat_b_hi else 0
        mem_delta = ((mem_r - mem_b) / mem_b * 100) if mem_b else 0
        lat_cls = "delta-good" if lat_delta < 0 else "delta-bad"
        mem_cls = "delta-good" if mem_delta < 0 else "delta-bad"

        st.markdown(f"""
        <div class="octa-stat-grid">
            <div class="octa-stat"><span class="octa-stat-val">{format_range((lat_b_lo, lat_b_hi)).replace('ms', '')}</span><span class="octa-stat-label">Before Latency (ms)</span></div>
            <div class="octa-stat"><span class="octa-stat-val">{format_range((lat_r_lo, lat_r_hi)).replace('ms', '')}</span><span class="octa-stat-label">After Latency (ms)</span></div>
            <div class="octa-stat"><span class="octa-stat-val">{mem_b:.0f}</span><span class="octa-stat-label">Before Mem (MB)</span></div>
            <div class="octa-stat"><span class="octa-stat-val">{mem_r:.0f}</span><span class="octa-stat-label">After Mem (MB)</span></div>
        </div>
        <table class="octa-table">
            <tr><th>Metric</th><th>Before</th><th>After</th><th>Delta</th></tr>
            <tr><td>Latency range</td><td>{lat_b_lo:.1f}–{lat_b_hi:.1f} ms</td><td>{lat_r_lo:.1f}–{lat_r_hi:.1f} ms</td><td class="{lat_cls}">{lat_delta:+.1f}%</td></tr>
            <tr><td>Memory usage</td><td>{mem_b:.1f} MB</td><td>{mem_r:.1f} MB</td><td class="{mem_cls}">{mem_delta:+.1f}%</td></tr>
            <tr><td>Confidence</td><td>{b.get('confidence','—')}</td><td>{r.get('confidence','—')}</td><td>—</td></tr>
            <tr><td>Config applied</td><td colspan="3">{cfg}</td></tr>
        </table>
        """, unsafe_allow_html=True)

        st.markdown('<div class="octa-section" style="margin-top:1.5rem;">Recommendation</div>', unsafe_allow_html=True)
        rec = st.session_state["strategy"].get("recommendation", "No recommendation available.")
        st.markdown(f"""
        <div class="octa-card" style="border-top-color:#00ff88;">
            <span style="font-size:0.8rem;color:#00ff88;font-family:'Fira Code',monospace;line-height:1.7;">{rec}</span>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown("""
        <div style="border:1px solid #1a1a1a;padding:3rem 2rem;text-align:center;
                    font-family:'Fira Code',monospace;font-size:0.75rem;color:#2a2a2a;">
            <div style="font-size:2rem;margin-bottom:1rem;opacity:0.15;">⚙</div>
            no results yet<br>run the pipeline to see output
        </div>
        """, unsafe_allow_html=True)


# ── Footer ─────────────────────────────────────────────────────────────────────
st.markdown("""
<div style="margin-top:3rem;border-top:1px solid #1a1a1a;padding-top:1rem;
            display:flex;justify-content:space-between;font-size:0.65rem;
            color:#2a2a2a;font-family:'Fira Code',monospace;">
    <span>SYSAWARE-ML-OPTIMIZER  /  MVP v0.1</span>
    <span>PYTORCH  •  PSUTIL  •  STREAMLIT</span>
</div>
""", unsafe_allow_html=True)
