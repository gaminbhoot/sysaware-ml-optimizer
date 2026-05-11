import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Cpu, 
  Layers, 
  Settings, 
  Zap, 
  Terminal, 
  ChevronRight, 
  Monitor, 
  Database, 
  Activity,
  RefreshCw,
  Search,
  MessageSquare,
  BarChart3,
  CpuIcon,
  HardDrive,
  Info
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Components ---

const GlassCard = ({ children, className, delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
    className={cn("glass glass-hover rounded-3xl p-8 relative overflow-hidden group transition-all duration-300", className)}
  >
    {children}
  </motion.div>
);

const SkeletonItem = () => (
  <div className="flex justify-between items-center bg-white/[0.01] p-4 rounded-2xl border border-white/5 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-3.5 h-3.5 rounded-md bg-white/5" />
      <div className="w-20 h-2 bg-white/5 rounded" />
    </div>
    <div className="w-16 h-3 bg-white/5 rounded" />
  </div>
);

const Badge = ({ children, color = "primary" }: { children: React.ReactNode, color?: "primary" | "accent" | "purple" }) => {
  const colors = {
    primary: "bg-white/5 border-white/10 text-white/90",
    accent: "bg-[#E8ff00]/10 border-[#E8ff00]/20 text-[#E8ff00]",
    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400"
  };
  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase border shadow-sm", colors[color])}>
      {children}
    </span>
  );
};

const StatItem = ({ label, value, icon: Icon, highlight, warning }: { label: string, value: string | number, icon?: any, highlight?: boolean, warning?: boolean }) => (
  <div className="flex justify-between items-center bg-white/[0.02] p-4 rounded-2xl border border-white/5 group/stat hover:bg-white/[0.04] transition-all focus-within:ring-2 focus-within:ring-white/20 outline-none">
    <div className="flex items-center gap-3">
      {Icon && <Icon size={14} className="text-white/50" aria-hidden="true" />}
      <span className="text-white/60 text-[10px] tracking-widest uppercase font-bold">{label}</span>
    </div>
    <span className={cn(
      "font-mono text-sm tracking-tight text-right", 
      highlight ? "text-[#E8ff00] font-bold" : (warning ? "text-red-400" : "text-white")
    )}>
      {value}
    </span>
  </div>
);

// --- Main App ---

export default function App() {
  const [systemProfile, setSystemProfile] = useState<any>(null);
  const [modelAnalysis, setModelAnalysis] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
  const [modelPath, setModelPath] = useState('');
  const [goal, setGoal] = useState('latency');
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState('profile');

  // Prompt Optimizer State
  const [promptInput, setPromptInput] = useState('');
  const [promptIntent, setPromptIntent] = useState('general');
  const [promptResult, setPromptResult] = useState<any>(null);

  const fetchSystem = async () => {
    setLoading(prev => ({ ...prev, system: true }));
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      setSystemProfile(data.profile);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, system: false }));
  };

  const analyzeModel = async () => {
    if (!modelPath) return;
    setLoading(prev => ({ ...prev, model: true }));
    try {
      const res = await fetch('/api/model/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_path: modelPath, unsafe_load: false })
      });
      const data = await res.json();
      setModelAnalysis(data.analysis);
      setActiveTab('optimizer');
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, model: false }));
  };

  const getOptimizationStrategy = async () => {
    if (!systemProfile || !goal) return;
    setLoading(prev => ({ ...prev, strategy: true }));
    try {
      const res = await fetch('/api/optimize/strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          system_profile: systemProfile, 
          goal, 
          model_analysis: modelAnalysis 
        })
      });
      const data = await res.json();
      setStrategy(data.strategy);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, strategy: false }));
  };

  const optimizePromptAction = async () => {
    if (!promptInput) return;
    setLoading(prev => ({ ...prev, prompt: true }));
    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput, intent: promptIntent })
      });
      const data = await res.json();
      setPromptResult(data.result);
    } catch (e) { console.error(e); }
    setLoading(prev => ({ ...prev, prompt: false }));
  };

  return (
    <div className="min-h-screen mesh-gradient text-white selection:bg-[#E8ff00] selection:text-black font-sans antialiased overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[30%] right-[10%] w-[30vw] h-[30vw] bg-cyan-400/5 blur-[100px] rounded-full" />
      </div>

      <div className="max-w-[1400px] mx-auto px-6 py-12 lg:py-20 relative z-10">
        {/* Navigation / Header */}
        <nav className="flex flex-col md:flex-row justify-between items-center mb-20 gap-8">
          <div className="flex flex-col items-center md:items-start">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="font-serif text-5xl md:text-7xl font-black tracking-tighter leading-none"
            >
              sys<span className="text-white/40 italic">aware</span>
            </motion.h1>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2"
            >
              <Badge color="primary">ml architecture optimizer v2.1</Badge>
            </motion.div>
          </div>

          <div className="flex items-center gap-2 p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-xl">
            {['profile', 'optimizer', 'prompts'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                aria-label={`Switch to ${tab} view`}
                className={cn(
                  "px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 outline-none focus:ring-2 focus:ring-white/20",
                  activeTab === tab 
                    ? "bg-white text-black shadow-lg shadow-white/10" 
                    : "text-white/40 hover:text-white/70"
                )}
              >
                {tab}
              </button>
            ))}
          </div>
        </nav>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">
          {/* Left Column: Core Context */}
          <div className="lg:col-span-4 space-y-8">
            <GlassCard delay={0.1}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                    <Monitor size={20} className="text-cyan-400" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest text-white/90">System Node</h2>
                    <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Host Telemetry</p>
                  </div>
                </div>
                {systemProfile && (
                  <button 
                    onClick={fetchSystem} 
                    disabled={loading.system} 
                    aria-label="Refresh hardware telemetry"
                    className="p-3 -m-3 text-white/20 hover:text-white/50 transition-colors outline-none focus:ring-2 focus:ring-white/10 rounded-full"
                  >
                    <RefreshCw size={14} className={cn(loading.system && "animate-spin")} />
                  </button>
                )}
              </div>

              <div className="max-h-[380px] overflow-y-auto pr-2 custom-scrollbar space-y-3">
                {loading.system ? (
                  <>
                    <SkeletonItem />
                    <SkeletonItem />
                    <SkeletonItem />
                    <SkeletonItem />
                    <SkeletonItem />
                  </>
                ) : !systemProfile ? (
                  <button 
                    onClick={fetchSystem}
                    disabled={loading.system}
                    aria-label="Start hardware diagnostic scan"
                    className="w-full py-16 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 group hover:border-white/20 transition-all outline-none focus:ring-2 focus:ring-cyan-500/20"
                  >
                    <div className={cn("w-12 h-12 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-white/5", loading.system && "animate-spin")}>
                      <Cpu size={20} className="text-white/50" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Initiate Hardware Scan</span>
                  </button>
                ) : (
                  <>
                    <StatItem label="OS Cluster" value={systemProfile.os || '—'} icon={Terminal} />
                    <StatItem label="Processor" value={systemProfile.processor || '—'} icon={CpuIcon} />
                    <StatItem label="Logic Cores" value={systemProfile.cpu_cores || '—'} icon={Cpu} />
                    <StatItem label="Buffer RAM" value={`${systemProfile.ram_gb?.toFixed(1)} GB`} icon={HardDrive} />
                    <StatItem 
                      label="Primary dGPU" 
                      value={systemProfile.dgpu_name || 'Generic'} 
                      highlight={!!systemProfile.dgpu_name} 
                      warning={!systemProfile.dgpu_name}
                      icon={Monitor} 
                    />
                    <StatItem 
                      label="NPU Core" 
                      value={systemProfile.npu_name || 'Not Detected'} 
                      highlight={!!systemProfile.npu_available}
                      icon={Zap} 
                    />
                    <StatItem label="Platform" value={systemProfile.platform || '—'} />
                    <StatItem label="Machine" value={systemProfile.machine || '—'} />
                    {systemProfile.gpu_count > 0 && (
                      <StatItem label="GPU Instances" value={systemProfile.gpu_count} highlight />
                    )}
                  </>
                )}
              </div>
            </GlassCard>

            <GlassCard delay={0.2}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <Database size={20} className="text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-widest text-white/90">Payload</h2>
                  <p className="text-[10px] text-white/50 uppercase font-bold tracking-wider">Architecture Input</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2" htmlFor="model-path">Model Path (.pt/.pth)</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} aria-hidden="true" />
                    <input 
                      id="model-path"
                      type="text"
                      value={modelPath}
                      onChange={(e) => setModelPath(e.target.value)}
                      placeholder="/models/vision_transformer.pt"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#E8ff00]/30 focus:border-[#E8ff00]/50 transition-all"
                    />
                  </div>
                </div>

                <button 
                  onClick={analyzeModel}
                  disabled={loading.model || !modelPath}
                  aria-label="Execute architecture analysis"
                  className="w-full group relative py-4 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 outline-none focus:ring-2 focus:ring-white/20"
                >
                  <span className="relative z-10">{loading.model ? 'Synthesizing...' : 'Load & Analyze'}</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </GlassCard>
          </div>

          {/* Right Column: Dynamic Analysis & Features */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeTab === 'profile' && (
                <motion.div
                  key="profile"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <GlassCard delay={0.3} className="bg-indigo-500/[0.02]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">Payload Insights</h3>
                      {modelAnalysis ? (
                        <div className="grid grid-cols-1 gap-4">
                          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-6xl md:text-7xl font-black italic tracking-tighter block mb-2 relative z-10">
                              {Math.round(modelAnalysis.num_params / 1000000)}M
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 relative z-10">Total Parameters</span>
                          </div>
                          <div className="p-8 rounded-[2.5rem] bg-black/40 border border-white/5 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-6xl md:text-7xl font-black italic tracking-tighter block mb-2 relative z-10">
                              {modelAnalysis.size_mb?.toFixed(1)}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-400 relative z-10">Disk Size (MB)</span>
                          </div>
                        </div>
                      ) : (
                        <div className="py-24 text-center border-2 border-dashed border-white/5 rounded-[2.5rem]">
                          <Layers size={48} className="mx-auto text-white/5 mb-6" />
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/10">Architecture synthesis pending</p>
                        </div>
                      )}
                    </GlassCard>

                    <GlassCard delay={0.4} className="bg-emerald-500/[0.02]">
                      <h3 className="text-xs font-black uppercase tracking-widest text-white/40 mb-6">Environment Status</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                          <Terminal size={18} className="text-white/40" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Kernel Status</span>
                            <span className="text-xs font-mono text-white/70 tracking-tight">System.Ready = true</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 rounded-3xl bg-white/[0.02] border border-white/5 transition-all hover:bg-white/[0.04]">
                          <Activity size={18} className="text-white/40" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/20">Telemetry Delay</span>
                            <span className="text-xs font-mono text-white/70 tracking-tight">Latency.ms = 0.02ms</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 p-5 rounded-3xl bg-emerald-500/5 border border-emerald-500/10">
                          <Zap size={18} className="text-emerald-400/70" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400/30">Optimization Engine</span>
                            <span className="text-xs font-mono text-emerald-400 tracking-tight font-bold uppercase">v2.1 Online</span>
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </div>
                </motion.div>
              )}

              {activeTab === 'optimizer' && (
                <motion.div
                  key="optimizer"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <GlassCard delay={0.1}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Optimization Matrix</h2>
                        <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">Select target objective</p>
                      </div>

                      <div className="flex gap-2 p-1.5 bg-white/5 rounded-2xl border border-white/10">
                        {['latency', 'throughput', 'memory'].map(g => (
                          <button
                            key={g}
                            onClick={() => setGoal(g)}
                            className={cn(
                              "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                              goal === g ? "bg-[#E8ff00] text-black shadow-lg shadow-[#E8ff00]/10" : "text-white/40 hover:text-white"
                            )}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={getOptimizationStrategy}
                      disabled={loading.strategy || !systemProfile || !modelAnalysis}
                      className="w-full py-10 rounded-[2.5rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-[0.5em] transition-all flex items-center justify-center gap-4 shadow-3xl shadow-indigo-600/30 active:scale-[0.99] disabled:opacity-50"
                    >
                      {loading.strategy ? <RefreshCw className="animate-spin" /> : <Settings size={24} />}
                      Generate Synthesis
                    </button>

                    {strategy && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12 p-10 rounded-[3rem] bg-white/[0.03] border border-white/10 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-5">
                          <BarChart3 size={120} />
                        </div>
                        
                        <div className="flex items-center gap-4 mb-10 relative z-10">
                          <div className="w-10 h-10 rounded-full bg-[#E8ff00] flex items-center justify-center text-black shadow-[0_0_20px_rgba(232,255,0,0.3)]">
                            <ChevronRight size={22} />
                          </div>
                          <h4 className="text-sm font-black uppercase tracking-widest text-[#E8ff00]">Proposed Strategy</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">Quantization</span>
                            <p className="text-lg font-bold tracking-tight">{strategy.quantization || 'FP16'}</p>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">Compute Target</span>
                            <p className="text-lg font-bold tracking-tight">{strategy.device || 'CUDA:0'}</p>
                          </div>
                          <div className="space-y-3">
                            <span className="text-[10px] font-black uppercase text-white/20 tracking-[0.2em]">Est. Efficiency</span>
                            <p className="text-3xl font-black text-emerald-400 italic">+{strategy.expected_improvement || '24'}%</p>
                          </div>
                        </div>

                        <div className="mt-10 pt-10 border-t border-white/5 relative z-10">
                          <div className="flex gap-4">
                            <Info size={18} className="text-[#E8ff00] shrink-0 mt-1" />
                            <p className="text-sm text-white/70 leading-relaxed font-medium">
                              {strategy.recommendation || "System recommends utilizing TensorRT compilation for the detected GPU architecture to minimize inference overhead."}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {activeTab === 'prompts' && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                  <GlassCard delay={0.1}>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-10">
                      <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Prompt Optimizer</h2>
                        <p className="text-xs text-white/40 mt-1 uppercase font-bold tracking-widest">Enhance LLM architecture instructions</p>
                      </div>

                      <select 
                        value={promptIntent}
                        onChange={(e) => setPromptIntent(e.target.value)}
                        className="bg-white/5 border border-white/10 rounded-xl px-6 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                      >
                        <option value="general">General Purpose</option>
                        <option value="coding">Engineering / Code</option>
                        <option value="analysis">Deep Analysis</option>
                        <option value="creative">Creative Flow</option>
                      </select>
                    </div>

                    <div className="space-y-6">
                      <textarea 
                        value={promptInput}
                        onChange={(e) => setPromptInput(e.target.value)}
                        placeholder="Paste your prompt here to initiate refinement..."
                        className="w-full h-40 bg-black/40 border border-white/10 rounded-[2rem] p-8 text-sm font-medium focus:outline-none focus:border-purple-500/50 transition-all resize-none placeholder:text-white/10"
                      />

                      <button
                        onClick={optimizePromptAction}
                        disabled={loading.prompt || !promptInput}
                        className="w-full py-6 rounded-[1.5rem] bg-purple-600 hover:bg-purple-500 text-white font-black text-[10px] uppercase tracking-[0.4em] transition-all flex items-center justify-center gap-4 shadow-xl shadow-purple-600/20 disabled:opacity-50"
                      >
                        {loading.prompt ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                        Refine Prompt Logic
                      </button>
                    </div>

                    {promptResult && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-12 space-y-8"
                      >
                        <div className="grid grid-cols-2 gap-6">
                          <div className="bg-black/30 border border-white/5 p-6 rounded-[2rem] text-center">
                            <span className="text-[9px] font-black uppercase text-white/20 tracking-widest block mb-2">Original Score</span>
                            <span className="text-3xl font-black text-white/50 italic">{promptResult.before_score}/100</span>
                          </div>
                          <div className="bg-purple-500/10 border border-purple-500/20 p-6 rounded-[2rem] text-center">
                            <span className="text-[9px] font-black uppercase text-purple-400/50 tracking-widest block mb-2">Optimized Score</span>
                            <span className="text-3xl font-black text-purple-400 italic">{promptResult.after_score}/100</span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center gap-3 ml-2">
                            <MessageSquare size={14} className="text-purple-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Refined Output</span>
                          </div>
                          <div className="bg-black/60 border border-white/10 rounded-[2.5rem] p-8 text-sm font-medium leading-relaxed selection:bg-purple-500 selection:text-white">
                            {promptResult.optimized_prompt}
                          </div>
                        </div>

                        {promptResult.suggestions && promptResult.suggestions.length > 0 && (
                          <div className="space-y-4 ml-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Structural Improvements</span>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {promptResult.suggestions.map((s: string, i: number) => (
                                <div key={i} className="flex gap-3 text-[11px] font-medium text-white/60 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
                                  <ChevronRight size={14} className="text-purple-500 shrink-0 mt-0.5" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
      
      {/* Custom Styles for Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
