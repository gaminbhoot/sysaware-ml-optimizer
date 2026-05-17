import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, Trash2, ShieldAlert, Cpu, HardDrive, Info, 
  FolderOpen, Link2, Globe, RefreshCcw, Activity, Layers,
  Stethoscope, Zap, CheckCircle2, AlertCircle, BarChart3, Clock
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import { cn } from '../lib/utils';

// --- Sub-Components ---

const DiagnosticFinding = ({ finding }: { finding: any }) => {
  const iconMap: any = {
    dtype_inefficiency: <Zap className="text-yellow-400" size={16} />,
    dead_neurons: <ShieldAlert className="text-blue-400" size={16} />,
    quantization_headroom: <BarChart3 className="text-emerald-400" size={16} />
  };

  const severityStyles: any = {
    warning: "border-yellow-500/20 bg-yellow-500/5 text-yellow-200",
    info: "border-blue-500/20 bg-blue-500/5 text-blue-200",
    success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-200",
    error: "border-red-500/20 bg-red-500/5 text-red-200"
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn("p-4 rounded-xl border flex gap-4 items-start mb-3", severityStyles[finding.severity] || severityStyles.info)}
    >
      <div className="mt-1">{iconMap[finding.type] || <Info size={16} />}</div>
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">{finding.type.replace('_', ' ')}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 uppercase">{finding.impact} Impact</span>
        </div>
        <p className="text-xs leading-relaxed">{finding.message}</p>
      </div>
    </motion.div>
  );
};

// --- Main Component ---

export const ModelAnalysis = () => {
  const { 
    modelAnalysis, setModelAnalysis, 
    modelPath, setModelPath, 
    lmStudioHost, setLmStudioHost,
    lmStudioPort, setLmStudioPort,
    isDiagnosing, setIsDiagnosing,
    diagnosticFindings, setDiagnosticFindings,
    isRuntimeTuning, setIsRuntimeTuning,
    runtimeTuningProgress, setRuntimeTuningProgress,
    optimalRuntimeConfig, setOptimalRuntimeConfig,
    systemProfile
  } = useStore();
  
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [unsafeLoad, setUnsafeLoad] = useState(false);
  const [activeMode, setActiveTabMode] = useState<'path' | 'lmstudio'>('path');
  const [hubTab, setHubTab] = useState<'inspect' | 'diagnose' | 'tune'>('inspect');

  // --- Handlers ---

  const analyzeModel = async () => {
    if (!modelPath) return;
    setLoading(true);
    try {
      const res = await fetch('/api/model/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath, unsafe_load: unsafeLoad })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setModelAnalysis(data.analysis);
      } else {
        throw new Error(data.detail || 'Analysis failed');
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Analysis Error', message: e.message });
    }
    setLoading(false);
  };

  const syncLMStudio = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lmstudio/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: lmStudioHost, port: lmStudioPort })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setModelAnalysis(data.analysis);
        if (data.analysis.path) setModelPath(data.analysis.path);
        addNotification({ 
          type: 'success', 
          title: 'LM Studio Synced', 
          message: `Connected to model: ${data.analysis.model_name}` 
        });
      } else {
        throw new Error(data.detail || 'Connection failed');
      }
    } catch (e: any) {
      addNotification({ 
        type: 'error', 
        title: 'Sync Failed', 
        message: 'Ensure LM Studio local server is active at ' + lmStudioHost 
      });
    }
    setLoading(false);
  };

  const runDiagnostics = async () => {
    if (!modelPath) return;
    setIsDiagnosing(true);
    setDiagnosticFindings([]);
    try {
      const response = await fetch('/api/diagnose/custom/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath, unsafe_load: unsafeLoad })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.status === 'complete') {
              setDiagnosticFindings(data.findings);
              setIsDiagnosing(false);
            } else if (data.findings) {
              // Partial update if supported
            }
          }
        }
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Diagnostic Error', message: e.message });
      setIsDiagnosing(false);
    }
  };

  const runRuntimeTuner = async () => {
    if (!modelAnalysis) return;
    setIsRuntimeTuning(true);
    setRuntimeTuningProgress([]);
    setOptimalRuntimeConfig(null);
    
    try {
      const response = await fetch('/api/tune/runtime/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model_id: modelAnalysis.model_name, 
          source: modelAnalysis.external_source || 'local',
          system_profile: systemProfile || { device: 'cpu' }
        })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.status === 'complete') {
              setOptimalRuntimeConfig(data.optimal_config);
              setIsRuntimeTuning(false);
            } else {
              setRuntimeTuningProgress(prev => [...prev, data]);
            }
          }
        }
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Tuning Error', message: e.message });
      setIsRuntimeTuning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30 overflow-x-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-emerald/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30vw] h-[30vw] bg-silver/5 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 pt-24 pb-32 md:pt-32 md:pb-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full flex flex-col gap-8 md:gap-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-2">
              Model <span className="text-white/20 italic">Hub</span>
            </h1>
            <p className="text-luxury-subheading text-white/40 max-w-2xl">
              Central orchestration for deep diagnostics and runtime parameter tuning.
            </p>
          </div>

          {/* Hub Tab Switcher */}
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
            {[
              { id: 'inspect', label: 'Inspect', icon: Search },
              { id: 'diagnose', label: 'Diagnostic', icon: Stethoscope },
              { id: 'tune', label: 'Tuner', icon: Activity },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setHubTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all",
                  hubTab === tab.id ? "bg-white text-black shadow-2xl" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            <AnimatePresence mode="wait">
              {hubTab === 'inspect' && (
                <motion.div
                  key="inspect"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-8"
                >
                  {/* Selection & Input Cards (Legacy logic kept but cleaned up) */}
                  <div className="glass-card p-2">
                    <div className="flex p-1 bg-white/[0.03] rounded-xl gap-1">
                        <button 
                          onClick={() => setActiveTabMode('path')}
                          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${activeMode === 'path' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white'}`}
                        >
                          <FolderOpen size={14} /> Local Filesystem
                        </button>
                        <button 
                          onClick={() => setActiveTabMode('lmstudio')}
                          className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${activeMode === 'lmstudio' ? 'bg-white/10 text-white border border-white/10' : 'text-white/40 hover:text-white'}`}
                        >
                          <Link2 size={14} /> LM Studio Bridge
                        </button>
                    </div>
                  </div>

                  <div className="glass-card p-8 md:p-10 relative overflow-hidden">
                    <div className="flex flex-col gap-8">
                      {activeMode === 'path' ? (
                        <div className="flex flex-col gap-4">
                          <label className="text-luxury-mono text-[10px] tracking-widest uppercase text-white/40">Model Filesystem Path</label>
                          <div className="relative flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group/input">
                              <input
                                type="text"
                                value={modelPath}
                                onChange={(e) => setModelPath(e.target.value)}
                                placeholder="/Volumes/Storage/Models/llama-3-8b.safetensors"
                                className="w-full bg-black/60 border border-white/5 rounded-2xl py-6 pl-14 pr-6 text-white font-mono text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-emerald/20 transition-all placeholder:text-white/10"
                              />
                              <Database className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald transition-colors" size={20} />
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/model/browse');
                                  const data = await res.json();
                                  if (data.status === 'success' && data.path) {
                                    setModelPath(data.path);
                                  }
                                } catch (e) {
                                  console.error('Browse failed', e);
                                }
                              }}
                              className="flex items-center justify-center gap-3 px-10 py-6 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 shadow-xl"
                            >
                              <FolderOpen size={16} />
                              Browse
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <label className="text-luxury-mono text-[10px] tracking-widest uppercase text-white/40">LM Studio Server Instance</label>
                          <div className="relative flex flex-col md:flex-row gap-4">
                            <div className="relative flex-1 group/input">
                              <input
                                type="text"
                                value={lmStudioHost}
                                onChange={(e) => setLmStudioHost(e.target.value)}
                                placeholder="127.0.0.1"
                                className="w-full bg-black/60 border border-white/5 rounded-2xl py-6 pl-14 pr-6 text-white font-mono text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-emerald/20 transition-all placeholder:text-white/10"
                              />
                              <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald transition-colors" size={20} />
                            </div>
                            <div className="relative w-full md:w-32 group/input">
                              <input
                                type="number"
                                value={lmStudioPort}
                                onChange={(e) => setLmStudioPort(parseInt(e.target.value) || 0)}
                                placeholder="1234"
                                className="w-full bg-black/60 border border-white/5 rounded-2xl py-6 px-6 text-white font-mono text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-emerald/20 transition-all placeholder:text-white/10"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 items-center justify-between pt-6 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={activeMode === 'path' ? analyzeModel : syncLMStudio}
                            disabled={loading || (activeMode === 'path' ? !modelPath : !lmStudioHost)}
                            className={cn(
                              "group relative flex items-center justify-center gap-3 px-12 py-6 rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50",
                              activeMode === 'path' ? "bg-white text-black" : "bg-emerald text-black"
                            )}
                          >
                            {loading ? (
                              <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                            ) : (
                              <>
                                {activeMode === 'path' ? <Search size={16} /> : <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />}
                                <span>{activeMode === 'path' ? 'Inspect Model' : 'Sync with Studio'}</span>
                              </>
                            )}
                          </button>

                          {modelAnalysis && (
                            <button
                              onClick={() => {
                                setModelAnalysis(null);
                                if (activeMode === 'path') setModelPath('');
                              }}
                              className="p-6 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                              title="Unload Model"
                            >
                              <Trash2 size={20} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inspection Stats */}
                  {modelAnalysis && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-6"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="glass-card p-8 border-emerald/20">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-emerald/10 rounded-2xl text-emerald"><Cpu size={24} /></div>
                            <div>
                              <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Total Parameters</div>
                              <div className="font-mono text-4xl text-white tracking-tighter">{(modelAnalysis.num_params || 0).toLocaleString()}</div>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-emerald" initial={{ width: 0 }} animate={{ width: '70%' }} transition={{ duration: 1.5 }} />
                          </div>
                        </div>
                        <div className="glass-card p-8 border-silver/20">
                          <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-silver/10 rounded-2xl text-silver"><HardDrive size={24} /></div>
                            <div>
                              <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Disk Footprint</div>
                              <div className="font-mono text-4xl text-white tracking-tighter">{(modelAnalysis.size_mb || 0).toFixed(1)} <span className="text-sm opacity-30 uppercase tracking-widest ml-1">MB</span></div>
                            </div>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div className="h-full bg-silver" initial={{ width: 0 }} animate={{ width: '45%' }} transition={{ duration: 1.5, delay: 0.2 }} />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {hubTab === 'diagnose' && (
                <motion.div
                  key="diagnose"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-8"
                >
                  <div className="glass-card p-10 relative overflow-hidden">
                    {!modelAnalysis ? (
                      <div className="py-20 flex flex-col items-center text-center">
                        <Stethoscope size={48} className="text-white/10 mb-6" />
                        <h3 className="text-xl font-light mb-2">No Model Loaded</h3>
                        <p className="text-sm text-white/30 max-w-sm">Load a model in the Inspect tab first to run architectural diagnostics.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-8">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-light mb-2">Model Diagnostic</h3>
                            <p className="text-sm text-white/30">Deep scan for dtype inefficiencies, dead layers, and quantization headroom.</p>
                          </div>
                          <button
                            onClick={runDiagnostics}
                            disabled={isDiagnosing}
                            className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-xl font-mono text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isDiagnosing ? <RefreshCcw size={16} className="animate-spin" /> : <Zap size={16} />}
                            {isDiagnosing ? "Analyzing..." : "Initiate Scan"}
                          </button>
                        </div>

                        {/* Results / Progress */}
                        <div className="min-h-[300px] bg-white/[0.02] border border-white/5 rounded-2xl p-8">
                          {isDiagnosing ? (
                            <div className="flex flex-col items-center justify-center h-full py-12">
                              <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-24 h-24 rounded-full border-4 border-emerald/20 border-t-emerald flex items-center justify-center mb-8"
                              >
                                <Stethoscope size={32} className="text-emerald" />
                              </motion.div>
                              <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-emerald/60">Scanning Layers...</div>
                            </div>
                          ) : diagnosticFindings.length > 0 ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2 mb-8 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">
                                <Search size={14} /> Scan Results for {modelAnalysis.model_name}
                              </div>
                              {diagnosticFindings.map((f, i) => <DiagnosticFinding key={i} finding={f} />)}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full py-12 text-white/10">
                              <Stethoscope size={32} className="mb-4 opacity-50" />
                              <p className="text-xs font-mono uppercase tracking-widest">Ready for analysis</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {hubTab === 'tune' && (
                <motion.div
                  key="tune"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col gap-8"
                >
                  <div className="glass-card p-10 relative overflow-hidden">
                    {!modelAnalysis ? (
                      <div className="py-20 flex flex-col items-center text-center">
                        <Zap size={48} className="text-white/10 mb-6" />
                        <h3 className="text-xl font-light mb-2">Ready to Tune?</h3>
                        <p className="text-sm text-white/30 max-w-sm">Load a pre-built model to optimize its runtime split and context bounds.</p>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-10">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="text-2xl font-light mb-2">Parameter Tuner</h3>
                            <p className="text-sm text-white/30">Auto-benchmarking for VRAM split, max context, and concurrency ceilings.</p>
                          </div>
                          <button
                            onClick={runRuntimeTuner}
                            disabled={isRuntimeTuning}
                            className="flex items-center gap-3 px-8 py-4 bg-emerald text-black rounded-xl font-mono text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                          >
                            {isRuntimeTuning ? <RefreshCcw size={16} className="animate-spin" /> : <Activity size={16} />}
                            {isRuntimeTuning ? "Tuning..." : "Start Tuning"}
                          </button>
                        </div>

                        {/* Tuning Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Context Card */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex items-center gap-3 text-white/40">
                              <Clock size={16} />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Max Context</span>
                            </div>
                            <div className="text-3xl font-mono">
                              {optimalRuntimeConfig?.num_ctx || '—'}
                            </div>
                            {isRuntimeTuning && runtimeTuningProgress.some(p => p.step === 'context_length') && (
                              <motion.div className="absolute bottom-0 left-0 h-1 bg-emerald/40" initial={{ width: 0 }} animate={{ width: '100%' }} />
                            )}
                          </div>

                          {/* Split Card */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex items-center gap-3 text-white/40">
                              <Layers size={16} />
                              <span className="text-[10px] font-mono uppercase tracking-widest">VRAM Split</span>
                            </div>
                            <div className="text-3xl font-mono">
                              {optimalRuntimeConfig?.num_gpu === -1 ? '100% GPU' : optimalRuntimeConfig?.num_gpu || '—'}
                            </div>
                          </div>

                          {/* Concurrency Card */}
                          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
                            <div className="flex items-center gap-3 text-white/40">
                              <CheckCircle2 size={16} />
                              <span className="text-[10px] font-mono uppercase tracking-widest">Concurrency</span>
                            </div>
                            <div className="text-3xl font-mono">
                              {optimalRuntimeConfig?.concurrency_limit ? `${optimalRuntimeConfig.concurrency_limit}x` : '—'}
                            </div>
                          </div>
                        </div>

                        {/* Detailed Log */}
                        <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[10px] h-[200px] overflow-y-auto">
                          <div className="text-white/20 mb-4 uppercase tracking-widest">Process Log</div>
                          {runtimeTuningProgress.map((p, i) => (
                            <div key={i} className="flex gap-4 mb-2 text-white/60 animate-in fade-in slide-in-from-left-2">
                              <span className="text-emerald/50">[{p.status}]</span>
                              <span>{p.message}</span>
                            </div>
                          ))}
                          {isRuntimeTuning && <div className="text-emerald animate-pulse">Running active benchmarking...</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar Area */}
          <motion.div 
            className="lg:col-span-4 flex flex-col gap-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
          >
            {/* Status Panel */}
            <div className="glass-card p-8 border-white/5">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-white/5 rounded-lg">
                  <Activity size={18} className="text-white/40" />
                </div>
                <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Hub Status</h3>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono uppercase text-white/30 tracking-widest mb-1">Active Backend</span>
                    <span className="text-xs font-mono text-emerald uppercase tracking-tighter">
                      {modelAnalysis?.external_source || (modelPath ? 'Local Filesystem' : 'None')}
                    </span>
                  </div>
                  {modelAnalysis ? <CheckCircle2 className="text-emerald" size={16} /> : <AlertCircle className="text-white/10" size={16} />}
                </div>

                <div className="space-y-4 pt-4">
                   <div className="flex justify-between items-center text-[10px] font-mono tracking-tight">
                        <span className="text-white/20">System ID</span>
                        <span className="text-white/60">{systemProfile?.machine_id?.slice(0, 12) || 'UNREGISTERED'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono tracking-tight">
                        <span className="text-white/20">Optimization Goal</span>
                        <span className="text-white/60 uppercase">{useStore().goal}</span>
                    </div>
                </div>
              </div>
            </div>
            
            {/* Security Protocol (kept from original) */}
             <div className={cn("glass-card p-8 border-white/5 transition-all duration-500", unsafeLoad && 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]')}>
              <div className="flex items-center gap-3 mb-8">
                <div className={`p-2 rounded-lg transition-colors ${unsafeLoad ? 'bg-red-500/10' : 'bg-white/5'}`}>
                  <ShieldAlert size={18} className={unsafeLoad ? 'text-red-500' : 'text-white/40'} />
                </div>
                <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Security Protocol</h3>
              </div>
              <div className="space-y-4">
                 <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5">
                    <span className="text-[10px] font-mono text-white/60">Unsafe Ingest</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={unsafeLoad} onChange={(e) => setUnsafeLoad(e.target.checked)} className="sr-only peer" />
                      <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500 shadow-sm" />
                    </label>
                  </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
