import streamlit as st
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from core.contracts import GOALS, GOAL_LABELS

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
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;700;900&family=Fira+Code:wght@300;400;500&display=swap');

:root {
    --bg:        #0a0a0a;
    --surface:   #111111;
    --border:    #1f1f1f;
    --accent:    #00ffe0;
    --accent2:   #00ff88;
    --muted:     #3a3a3a;
    --text:      #e8e8e8;
    --text-dim:  #666666;
    --danger:    #ff4444;
    --warn:      #ffaa00;
}

html, body, [class*="css"] {
    font-family: 'Fira Code', monospace !important;
    background-color: var(--bg) !important;
    color: var(--text) !important;
}

.stApp {
    background-color: var(--bg) !important;
    background-image: radial-gradient(circle, #1e1e1e 1px, transparent 1px) !important;
    background-size: 28px 28px !important;
}

.main .block-container {
    padding: 2rem 3rem !important;
    max-width: 1200px !important;
}

.octa-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    border-bottom: 1px solid var(--accent);
    padding-bottom: 1.2rem;
    margin-bottom: 2.5rem;
}
.octa-logo {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.6rem;
    font-weight: 900;
    color: var(--accent);
    letter-spacing: 0.12em;
    text-transform: uppercase;
}
.octa-sub {
    font-size: 0.7rem;
    color: var(--text-dim);
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-top: 2px;
}
.octa-badge {
    margin-left: auto;
    font-size: 0.65rem;
    font-family: 'Orbitron', sans-serif;
    color: var(--accent2);
    border: 1px solid var(--accent2);
    padding: 3px 10px;
    letter-spacing: 0.15em;
}

.octa-section {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.65rem;
    letter-spacing: 0.25em;
    color: var(--accent);
    text-transform: uppercase;
    border-left: 2px solid var(--accent);
    padding-left: 10px;
    margin-bottom: 1rem;
    margin-top: 2rem;
}

.octa-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-top: 1px solid var(--accent);
    padding: 1.2rem 1.4rem;
    margin-bottom: 1rem;
    font-size: 0.82rem;
}
.octa-card-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    border-bottom: 1px solid var(--border);
}
.octa-card-row:last-child { border-bottom: none; }
.octa-key   { color: var(--text-dim); font-size: 0.75rem; letter-spacing: 0.05em; }
.octa-val   { color: var(--accent); font-family: 'Fira Code', monospace; font-size: 0.82rem; }
.octa-val-ok  { color: var(--accent2); }
.octa-val-bad { color: var(--danger); }

.octa-stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1px;
    background: var(--border);
    border: 1px solid var(--border);
    margin-bottom: 1rem;
}
.octa-stat {
    background: var(--surface);
    padding: 1rem;
    text-align: center;
}
.octa-stat-val {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.3rem;
    font-weight: 700;
    color: var(--accent);
    display: block;
}
.octa-stat-label {
    font-size: 0.6rem;
    color: var(--text-dim);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 4px;
    display: block;
}

.octa-table { width: 100%; border-collapse: collapse; font-size: 0.8rem; margin-top: 0.5rem; }
.octa-table th {
    font-family: 'Orbitron', sans-serif;
    font-size: 0.6rem;
    letter-spacing: 0.2em;
    color: var(--text-dim);
    text-transform: uppercase;
    border-bottom: 1px solid var(--border);
    padding: 6px 10px;
    text-align: left;
}
.octa-table td { padding: 8px 10px; border-bottom: 1px solid var(--border); font-family: 'Fira Code', monospace; color: var(--text); }
.octa-table tr:hover td { background: #161616; }
.delta-good { color: var(--accent2); }
.delta-bad  { color: var(--danger); }

.stButton > button {
    font-family: 'Orbitron', sans-serif !important;
    font-size: 0.65rem !important;
    letter-spacing: 0.2em !important;
    text-transform: uppercase !important;
    background: transparent !important;
    color: var(--accent) !important;
    border: 1px solid var(--accent) !important;
    border-radius: 0 !important;
    padding: 0.5rem 1.5rem !important;
    transition: all 0.2s !important;
}
.stButton > button:hover { background: var(--accent) !important; color: #000 !important; }
.stButton > button:active { transform: scale(0.98) !important; }

.stSelectbox > div > div,
.stTextInput > div > div > input {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    border-radius: 0 !important;
    color: var(--text) !important;
    font-family: 'Fira Code', monospace !important;
}
.stSelectbox label, .stTextInput label, .stRadio label {
    font-family: 'Orbitron', sans-serif !important;
    font-size: 0.6rem !important;
    letter-spacing: 0.2em !important;
    text-transform: uppercase !important;
    color: var(--text-dim) !important;
}
.stRadio > div > label {
    font-family: 'Fira Code', monospace !important;
    font-size: 0.78rem !important;
    text-transform: none !important;
    color: var(--text) !important;
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    padding: 6px 16px !important;
    cursor: pointer !important;
}
.stRadio > div > label:has(input:checked) { border-color: var(--accent) !important; color: var(--accent) !important; }
.stAlert { border-radius: 0 !important; border-left: 2px solid var(--accent) !important; background: var(--surface) !important; font-family: 'Fira Code', monospace !important; font-size: 0.8rem !important; }
hr { border-color: var(--border) !important; margin: 2rem 0 !important; }
[data-testid="stMetricValue"] { font-family: 'Orbitron', sans-serif !important; color: var(--accent) !important; font-size: 1.4rem !important; }
[data-testid="stMetricLabel"] { font-family: 'Orbitron', sans-serif !important; font-size: 0.6rem !important; letter-spacing: 0.15em !important; text-transform: uppercase !important; color: var(--text-dim) !important; }
[data-testid="stSidebar"] { background: var(--surface) !important; border-right: 1px solid var(--border) !important; }
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--muted); }
::-webkit-scrollbar-thumb:hover { background: var(--accent); }
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

    st.markdown('<div class="octa-section">01 / System Profile</div>', unsafe_allow_html=True)

    if st.button("▶  Analyze System", key="btn_system"):
        with st.spinner("Scanning hardware..."):
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from core.system_profiler import get_system_profile
            profile = get_system_profile()
            st.session_state["system_profile"] = profile

    if "system_profile" in st.session_state:
        p = st.session_state["system_profile"]
        gpu_val   = p.get("gpu_name", "None")
        vram_val  = f"{p.get('gpu_vram_gb', 0):.1f} GB" if p.get("gpu_available") else "—"
        gpu_class = "octa-val-ok" if p.get("gpu_available") else "octa-val-bad"
        st.markdown(f"""
        <div class="octa-card">
            <div class="octa-card-row"><span class="octa-key">OS</span><span class="octa-val">{p.get('os','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">CPU Cores</span><span class="octa-val">{p.get('cpu_cores','—')}</span></div>
            <div class="octa-card-row"><span class="octa-key">RAM</span><span class="octa-val">{p.get('ram_gb',0):.1f} GB</span></div>
            <div class="octa-card-row"><span class="octa-key">GPU</span><span class="{gpu_class}">{gpu_val}</span></div>
            <div class="octa-card-row"><span class="octa-key">VRAM</span><span class="{gpu_class}">{vram_val}</span></div>
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown('<div class="octa-card" style="color:#2a2a2a;font-size:0.75rem;text-align:center;padding:2rem;">[ awaiting scan ]</div>', unsafe_allow_html=True)

    st.markdown('<div class="octa-section">02 / Model Input</div>', unsafe_allow_html=True)

    model_path = st.text_input("Model path (.pt / .pth)", placeholder="e.g. /models/resnet50.pt")

    if st.button("▶  Load Model", key="btn_load") and model_path:
        with st.spinner("Analyzing model..."):
            import sys, os, torch
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from core.model_analyzer import analyze_model
            try:
                model = torch.load(model_path, map_location="cpu")
                analysis = analyze_model(model)
                st.session_state["model"] = model
                st.session_state["model_analysis"] = analysis
            except Exception as e:
                st.error(f"Load failed: {e}")

    if "model_analysis" in st.session_state:
        a = st.session_state["model_analysis"]
        st.markdown(f"""
        <div class="octa-card">
            <div class="octa-card-row"><span class="octa-key">Parameters</span><span class="octa-val">{a.get('num_params',0):,}</span></div>
            <div class="octa-card-row"><span class="octa-key">Size</span><span class="octa-val">{a.get('size_mb',0):.2f} MB</span></div>
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
            import sys, os
            sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
            from core.prompt_optimizer import optimize_prompt

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

    ready = "model" in st.session_state and "system_profile" in st.session_state
    if not ready:
        st.markdown('<div style="font-size:0.72rem;color:#2a2a2a;border:1px solid #1a1a1a;padding:0.8rem;font-family:\'Fira Code\',monospace;margin-bottom:1rem;">⚠ complete steps 01 and 02 first</div>', unsafe_allow_html=True)

    if st.button("▶▶  Run Optimization", key="btn_run", disabled=not ready):
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
        from core.estimator       import estimate_performance
        from core.strategy_engine import get_strategy
        from core.autotuner       import autotune

        model   = st.session_state["model"]
        profile = st.session_state["system_profile"]
        goal_v  = st.session_state["goal"]

        with st.spinner("Estimating baseline..."):
            baseline = estimate_performance(model, profile)
            st.session_state["baseline"] = baseline
        with st.spinner("Generating strategy..."):
            strategy = get_strategy(profile, goal_v)
            st.session_state["strategy"] = strategy
        with st.spinner("Autotuning configs..."):
            best_config, best_model, best_result = autotune(model, profile, goal_v)
            st.session_state["best_config"] = best_config
            st.session_state["best_model"]  = best_model
            st.session_state["best_result"] = best_result
        st.success("Pipeline complete.")

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
            <div class="octa-stat"><span class="octa-stat-val">{lat_b_lo:.0f}–{lat_b_hi:.0f}</span><span class="octa-stat-label">Before Latency (ms)</span></div>
            <div class="octa-stat"><span class="octa-stat-val">{lat_r_lo:.0f}–{lat_r_hi:.0f}</span><span class="octa-stat-label">After Latency (ms)</span></div>
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
