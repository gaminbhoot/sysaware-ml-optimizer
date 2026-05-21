import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, Trash2, ShieldAlert, Cpu, HardDrive, Info, 
  FolderOpen, Link2, Globe, RefreshCcw, Activity, Layers,
  Stethoscope, Zap, CheckCircle2, AlertCircle, BarChart3, Clock, ExternalLink,
  ChevronDown, Sparkles
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

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  delay?: number;
}

const StatsCard = ({ label, value, icon: Icon, color = "text-white", delay = 0 }: StatsCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 12, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card flex items-center justify-between group p-5 md:p-6 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 hover:shadow-[0_0_40px_rgba(255,255,255,0.02)] transition-all duration-500 cursor-default"
    role="status"
    aria-label={`${label}: ${value}`}
  >
    <div>
      <p className="text-luxury-mono mb-1.5 text-[9px] md:text-[11px] opacity-40 group-hover:opacity-80 transition-opacity duration-300 uppercase tracking-widest">{label}</p>
      <h3 className={cn("text-lg md:text-xl font-mono truncate max-w-[240px] transition-colors duration-300", color)} title={value}>{value}</h3>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-110 transition-all duration-300">
      <Icon size={18} className="text-silver/30 group-hover:text-silver/70 transition-colors duration-300" />
    </div>
  </motion.div>
);

const ModelCard = ({ model, idx, systemProfile }: { model: any, idx: number, systemProfile: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: idx * 0.06, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      "glass-card p-6 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all duration-300 flex flex-col gap-5",
      model.status === 'incompatible' ? 'opacity-40 hover:opacity-60' : 'hover:shadow-[0_0_60px_rgba(255,255,255,0.015)]'
    )}
  >
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
      <div className="flex-1 flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[13px] font-semibold tracking-tight text-white">{model.name}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-silver/50">{model.size}</span>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-md bg-white/5 text-silver/50">{model.format}</span>
          {model.status === 'perfect' ? (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-emerald/10 text-emerald uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <CheckCircle2 size={10} /> Optimal
            </span>
          ) : model.status === 'caution' ? (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-300 uppercase tracking-wider font-semibold flex items-center gap-1.5">
              <AlertCircle size={10} /> Tight Fit
            </span>
          ) : (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 uppercase tracking-wider font-semibold">Incompatible</span>
          )}
        </div>
        <p className="text-xs text-white/35 leading-relaxed max-w-xl">{model.description}</p>
      </div>
      <a 
        href={model.link}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl bg-white/5 border border-white/8 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all duration-300 flex items-center gap-2.5"
      >
        <ExternalLink size={12} /> View on HF
      </a>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest w-16 shrink-0">RAM</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className={cn(
            "h-full rounded-full",
            model.status === 'perfect' ? 'bg-emerald/60' : model.status === 'caution' ? 'bg-yellow-400/60' : 'bg-red-400/40'
          )}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(Math.min((model.ramNeeded / (parseFloat(systemProfile?.ram_gb) || 8)) * 100, 100), 5)}%` }}
          transition={{ duration: 1, delay: 0.3 + idx * 0.06 }}
        />
      </div>
      <span className="text-[9px] font-mono text-white/25 w-20 text-right shrink-0">{model.ramNeeded} GB needed</span>
    </div>
  </motion.div>
);

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
    systemProfile,
    availableModels, setAvailableModels,
    setSystemProfile
  } = useStore();
  
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [unsafeLoad, setUnsafeLoad] = useState(false);
  const [activeMode, setActiveTabMode] = useState<'path' | 'lmstudio'>('path');
  const [expandedPanel, setExpandedPanel] = useState<'selection' | 'recommendations'>('selection');
  const [hubTab, setHubTab] = useState<'inspect' | 'diagnose' | 'tune'>('inspect');

  const fetchSystemProfile = async () => {
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      if (data.status === 'success') {
        setSystemProfile(data.profile);
      }
    } catch (e) {
      console.error('Failed to fetch system profile', e);
    }
  };

  useEffect(() => {
    if (!systemProfile) {
      fetchSystemProfile();
    }
  }, []);

  const getHFRecommendations = () => {
    const ram = systemProfile?.ram_gb || 8;
    const isMac = systemProfile?.os?.toLowerCase().includes('mac') || systemProfile?.os?.toLowerCase().includes('darwin');
    const isMetal = systemProfile?.gpu_backend?.toLowerCase() === 'metal' || isMac;

    const allModels = [
      {
        repo_id: "mlx-community/Llama-3.2-3B-Instruct-4bit",
        name: "Llama 3.2 3B Instruct",
        size: "3B",
        format: "MLX (Apple Silicon)",
        description: "Meta's highly capable lightweight model, optimized for mobile & edge devices on Apple Silicon.",
        ramNeeded: 3,
        link: "https://huggingface.co/mlx-community/Llama-3.2-3B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Phi-3.5-mini-instruct-4bit",
        name: "Phi 3.5 Mini",
        size: "3.8B",
        format: "MLX (Apple Silicon)",
        description: "Microsoft's state-of-the-art small language model with incredible reasoning for its size.",
        ramNeeded: 3,
        link: "https://huggingface.co/mlx-community/Phi-3.5-mini-instruct-4bit"
      },
      {
        repo_id: "mlx-community/Meta-Llama-3-8B-Instruct-4bit",
        name: "Llama 3 8B Instruct",
        size: "8B",
        format: "MLX (Apple Silicon)",
        description: "The gold standard for 8B models. Superb dialogue, instruction following, and general reasoning.",
        ramNeeded: 6,
        link: "https://huggingface.co/mlx-community/Meta-Llama-3-8B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Gemma-2-9b-it-4bit",
        name: "Gemma 2 9B IT",
        size: "9B",
        format: "MLX (Apple Silicon)",
        description: "Google's ultra-efficient 9B model, known for clean outputs and strong factual accuracy.",
        ramNeeded: 7,
        link: "https://huggingface.co/mlx-community/Gemma-2-9b-it-4bit"
      },
      {
        repo_id: "mlx-community/Qwen2.5-7B-Instruct-4bit",
        name: "Qwen 2.5 7B Instruct",
        size: "7B",
        format: "MLX (Apple Silicon)",
        description: "Outstanding multilingual capability and strong coding/math intelligence.",
        ramNeeded: 5,
        link: "https://huggingface.co/mlx-community/Qwen2.5-7B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit",
        name: "Mistral NeMo 12B",
        size: "12B",
        format: "MLX (Apple Silicon)",
        description: "Collaborative effort between NVIDIA and Mistral. State-of-the-art for its size.",
        ramNeeded: 9,
        link: "https://huggingface.co/mlx-community/Mistral-Nemo-12B-Instruct-v1-4bit"
      },
      {
        repo_id: "mlx-community/Qwen2.5-14B-Instruct-4bit",
        name: "Qwen 2.5 14B Instruct",
        size: "14B",
        format: "MLX (Apple Silicon)",
        description: "High-performance model bridging the gap between lightweight edge and server-class reasoning.",
        ramNeeded: 11,
        link: "https://huggingface.co/mlx-community/Qwen2.5-14B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Qwen2.5-32B-Instruct-4bit",
        name: "Qwen 2.5 32B Instruct",
        size: "32B",
        format: "MLX (Apple Silicon)",
        description: "Server-class reasoning capabilities, offering highly detailed responses and complex coding skills.",
        ramNeeded: 24,
        link: "https://huggingface.co/mlx-community/Qwen2.5-32B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Meta-Llama-3-70B-Instruct-4bit",
        name: "Llama 3 70B Instruct",
        size: "70B",
        format: "MLX (Apple Silicon)",
        description: "State-of-the-art open weight reasoning and comprehension model. Requires massive unified memory.",
        ramNeeded: 42,
        link: "https://huggingface.co/mlx-community/Meta-Llama-3-70B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/Qwen2.5-72B-Instruct-4bit",
        name: "Qwen 2.5 72B Instruct",
        size: "72B",
        format: "MLX (Apple Silicon)",
        description: "Maximum reasoning performance for deep logic, complex coding, and specialized research.",
        ramNeeded: 48,
        link: "https://huggingface.co/mlx-community/Qwen2.5-72B-Instruct-4bit"
      },
      {
        repo_id: "mlx-community/DeepSeek-V3-4bit",
        name: "DeepSeek V3",
        size: "671B (MoE)",
        format: "MLX (Apple Silicon)",
        description: "The current frontier for open-weights models. Massive mixture-of-experts architecture.",
        ramNeeded: 380,
        link: "https://huggingface.co/mlx-community/DeepSeek-V3-4bit"
      },
      {
        repo_id: "lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF",
        name: "Llama 3 8B Instruct",
        size: "8B",
        format: "GGUF (Cross-platform)",
        description: "Perfect for LM Studio integration on Windows/Linux with CUDA or CPU backend.",
        ramNeeded: 6,
        link: "https://huggingface.co/lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF"
      },
      {
        repo_id: "lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF",
        name: "Mistral 7B v0.3",
        size: "7B",
        format: "GGUF (Cross-platform)",
        description: "Reliable and efficient 7B baseline. Excellent for general utility and summarization.",
        ramNeeded: 5,
        link: "https://huggingface.co/lmstudio-community/Mistral-7B-Instruct-v0.3-GGUF"
      },
      {
        repo_id: "lmstudio-community/Phi-3.5-mini-instruct-GGUF",
        name: "Phi 3.5 Mini",
        size: "3.8B",
        format: "GGUF (Cross-platform)",
        description: "Highly efficient reasoning in a compact GGUF format for cross-platform hardware.",
        ramNeeded: 3,
        link: "https://huggingface.co/lmstudio-community/Phi-3.5-mini-instruct-GGUF"
      },
      {
        repo_id: "lmstudio-community/Qwen2.5-7B-Instruct-GGUF",
        name: "Qwen 2.5 7B Instruct",
        size: "7B",
        format: "GGUF (Cross-platform)",
        description: "Outstanding multilingual capability. Runs extremely well on standard GPUs or CPU threads.",
        ramNeeded: 5,
        link: "https://huggingface.co/lmstudio-community/Qwen2.5-7B-Instruct-GGUF"
      },
      {
        repo_id: "lmstudio-community/Llama-3.2-3B-Instruct-GGUF",
        name: "Llama 3.2 3B Instruct",
        size: "3B",
        format: "GGUF (Cross-platform)",
        description: "Highly optimized lightweight model. Runs smoothly on laptops with lower VRAM or RAM specs.",
        ramNeeded: 3,
        link: "https://huggingface.co/lmstudio-community/Llama-3.2-3B-Instruct-GGUF"
      },
      {
        repo_id: "lmstudio-community/Qwen2.5-14B-Instruct-GGUF",
        name: "Qwen 2.5 14B Instruct",
        size: "14B",
        format: "GGUF (Cross-platform)",
        description: "Excellent model for detailed code generation and multi-step reasoning tasks.",
        ramNeeded: 11,
        link: "https://huggingface.co/lmstudio-community/Qwen2.5-14B-Instruct-GGUF"
      },
      {
        repo_id: "bartowski/gemma-2-27b-it-GGUF",
        name: "Gemma 2 27B IT",
        size: "27B",
        format: "GGUF (Cross-platform)",
        description: "Google's high-efficiency model, punching way above its weight in reasoning tasks.",
        ramNeeded: 18,
        link: "https://huggingface.co/bartowski/gemma-2-27b-it-GGUF"
      },
      {
        repo_id: "MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF",
        name: "Llama 3.1 70B Instruct",
        size: "70B",
        format: "GGUF (Cross-platform)",
        description: "Massive reasoning model. Requires high-end multi-GPU setups or significant system RAM.",
        ramNeeded: 42,
        link: "https://huggingface.co/MaziyarPanahi/Llama-3.1-70B-Instruct-GGUF"
      },
      {
        repo_id: "unsloth/Meta-Llama-3.1-405B-Instruct-GGUF-IQ4_XS",
        name: "Llama 3.1 405B Instruct",
        size: "405B",
        format: "GGUF (Cross-platform)",
        description: "The absolute frontier of open-weight LLMs. Requires multi-node server clusters to run efficiently.",
        ramNeeded: 230,
        link: "https://huggingface.co/unsloth/Meta-Llama-3.1-405B-Instruct-GGUF-IQ4_XS"
      },
      {
        repo_id: "mlx-community/Mixtral-8x22B-Instruct-v0.1-4bit",
        name: "Mixtral 8x22B Instruct",
        size: "141B",
        format: "MLX (Apple Silicon)",
        description: "High-throughput Mixture-of-Experts model. Exceptional for large-scale reasoning and logic.",
        ramNeeded: 82,
        link: "https://huggingface.co/mlx-community/Mixtral-8x22B-Instruct-v0.1-4bit"
      },
      {
        repo_id: "lmstudio-community/Command-R-Plus-GGUF",
        name: "Cohere Command R+",
        size: "104B",
        format: "GGUF (Cross-platform)",
        description: "Enterprise-grade model optimized for RAG and long-context tool use.",
        ramNeeded: 64,
        link: "https://huggingface.co/lmstudio-community/Command-R-Plus-GGUF"
      },
      {
        repo_id: "mlx-community/grok-1-4bit",
        name: "xAI Grok-1",
        size: "314B",
        format: "MLX (Apple Silicon)",
        description: "Massive raw parameter count model. Designed for deep knowledge and unconventional reasoning.",
        ramNeeded: 180,
        link: "https://huggingface.co/mlx-community/grok-1-4bit"
      }
    ];

    const processed = allModels.map(m => {
      const isMlx = m.format.includes("MLX");
      const formatMatch = isMetal ? isMlx : !isMlx;
      
      let status: 'perfect' | 'caution' | 'incompatible' = 'perfect';
      const ramRatio = m.ramNeeded / ram;
      if (ramRatio > 1.0) {
        status = 'incompatible';
      } else if (ramRatio >= 0.65) {
        status = 'caution';
      } else {
        status = 'perfect';
      }

      return {
        ...m,
        status,
        formatMatch
      };
    });

    return {
      optimal: processed.filter(m => m.status === 'perfect').sort((a, b) => {
        if (a.formatMatch !== b.formatMatch) return b.formatMatch ? 1 : -1;
        return b.ramNeeded - a.ramNeeded; // Show bigger optimal models first
      }),
      tight: processed.filter(m => m.status === 'caution').sort((_, b) => b.formatMatch ? 1 : -1),
      heavy: processed.filter(m => m.status === 'incompatible').sort((_, b) => b.formatMatch ? 1 : -1)
    };
  };

  // --- Handlers ---

  const fetchLMStudioModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lmstudio/models?host=${lmStudioHost}&port=${lmStudioPort}`);
      const data = await res.json();
      if (data.status === 'success') {
        setAvailableModels(data.models);
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Fetch Failed', message: 'Could not list LM Studio models' });
    }
    setLoading(false);
  };

  const loadLMStudioModel = async (modelId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/lmstudio/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model_id: modelId, host: lmStudioHost, port: lmStudioPort })
      });
      const data = await res.json();
      if (data.status === 'success') {
        addNotification({ type: 'success', title: 'Model Loaded', message: `Model ${modelId} is now active` });
        syncLMStudio(); // Sync metadata
      } else {
        throw new Error(data.detail || 'Load failed');
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Load Failed', message: e.message });
    }
    setLoading(false);
  };

  const unloadModel = async () => {
    setLoading(true);
    try {
      await fetch('/api/model/unload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model_id: modelAnalysis?.model_id || modelAnalysis?.model_name,
          host: lmStudioHost,
          port: lmStudioPort
        })
      });
      setModelAnalysis(null);
      if (activeMode === 'path') setModelPath("");
      setDiagnosticFindings([]);
      addNotification({ type: 'success', title: 'Model Unloaded', message: 'Memory cleared across backends' });
    } catch (e) {
      addNotification({ type: 'error', title: 'Unload Failed', message: 'Memory could not be cleared' });
    }
    setLoading(false);
  };

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

        {/* Analytics Overview (Three cards grid matching omlx structure) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <StatsCard 
            label="Active Model" 
            value={modelAnalysis?.model_name || "No Model Loaded"} 
            icon={Database} 
            color={modelAnalysis ? "text-emerald" : "text-white/40 font-light"}
            delay={0.1}
          />
          <StatsCard 
            label="Parameters" 
            value={modelAnalysis?.num_params ? `${(modelAnalysis.num_params / 1e9).toFixed(1)}B` : "—"} 
            icon={Cpu}
            delay={0.2}
          />
          <StatsCard 
            label="Disk Footprint" 
            value={modelAnalysis?.size_mb ? `${modelAnalysis.size_mb.toFixed(0)} MB` : "—"} 
            icon={HardDrive}
            delay={0.3}
          />
        </div>

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
                  className="flex flex-col gap-6"
                >
                  {/* Panel 1: Model Selection */}
                  <div className={cn(
                    "glass-card transition-all duration-500 overflow-hidden",
                    expandedPanel === 'selection' ? "border-emerald/20 shadow-[0_0_60px_rgba(16,185,129,0.03)]" : "border-white/5 opacity-60 hover:opacity-100"
                  )}>
                    <button 
                      onClick={() => setExpandedPanel('selection')}
                      className="w-full flex items-center justify-between p-8 md:p-10 text-left focus:outline-none group"
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          expandedPanel === 'selection' ? "bg-emerald/10 text-emerald rotate-0" : "bg-white/5 text-white/20 rotate-[-10deg] group-hover:rotate-0"
                        )}>
                          <Database size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-light tracking-tight text-white">Model <span className="text-white/20 italic">Selection</span></h3>
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mt-1">Ingest local assets or bridge LM Studio</p>
                        </div>
                      </div>
                      <div className={cn("transition-transform duration-500", expandedPanel === 'selection' ? "rotate-180 text-emerald" : "text-white/20")}>
                        <ChevronDown size={20} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedPanel === 'selection' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="px-8 md:px-10 pb-10 flex flex-col gap-8 border-t border-white/5 pt-8">
                            {/* Inner Tabs: Path vs LM Studio */}
                            <div className="flex p-1 bg-white/[0.03] rounded-xl gap-1 max-w-md">
                                <button 
                                  onClick={() => setActiveTabMode('path')}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-3 py-3 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all",
                                    activeMode === 'path' ? "bg-white/10 text-white border border-white/10" : "text-white/40 hover:text-white"
                                  )}
                                >
                                  <FolderOpen size={12} /> Filesystem
                                </button>
                                <button 
                                  onClick={() => setActiveTabMode('lmstudio')}
                                  className={cn(
                                    "flex-1 flex items-center justify-center gap-3 py-3 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all",
                                    activeMode === 'lmstudio' ? "bg-white/10 text-white border border-white/10" : "text-white/40 hover:text-white"
                                  )}
                                >
                                  <Link2 size={12} /> Bridge
                                </button>
                            </div>

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
                                <div className="flex justify-between items-center">
                                  <label className="text-luxury-mono text-[10px] tracking-widest uppercase text-white/40">LM Studio Server Instance</label>
                                  <button 
                                    onClick={fetchLMStudioModels}
                                    className="text-[10px] font-mono uppercase tracking-widest text-emerald hover:text-emerald/80 flex items-center gap-2 transition-colors"
                                  >
                                    <RefreshCcw size={12} className={loading ? "animate-spin" : ""} /> Sync Library
                                  </button>
                                </div>
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

                                {/* Available Models List */}
                                <AnimatePresence>
                                  {availableModels.length > 0 && (
                                    <motion.div 
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      exit={{ opacity: 0, height: 0 }}
                                      className="mt-6 flex flex-col gap-3 overflow-hidden"
                                    >
                                      <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/20 mb-2">Downloaded Models</label>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {availableModels.map((model) => {
                                          const isActive = modelAnalysis?.model_id === model.model_id;
                                          return (
                                            <button
                                              key={model.model_id || model.model_name}
                                              onClick={() => !isActive && loadLMStudioModel(model.model_id || model.model_name)}
                                              className={cn(
                                                "p-4 rounded-xl border text-left transition-all group flex items-center justify-between",
                                                isActive 
                                                  ? "bg-emerald/10 border-emerald/30 text-emerald" 
                                                  : "bg-white/[0.02] border-white/5 text-white/60 hover:border-white/10 hover:bg-white/[0.04]"
                                              )}
                                            >
                                              <div className="flex flex-col gap-1 overflow-hidden">
                                                <span className="text-[11px] font-medium truncate">{model.model_name}</span>
                                                <span className="text-[9px] font-mono opacity-40 uppercase">{(model.num_params / 1e9).toFixed(1)}B Params</span>
                                              </div>
                                              {isActive ? (
                                                <CheckCircle2 size={14} className="flex-shrink-0" />
                                              ) : (
                                                <Zap size={14} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}

                            <div className="flex flex-wrap gap-4 items-center justify-between pt-8 border-t border-white/5">
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
                                      <span>{activeMode === 'path' ? 'Inspect Model' : 'Sync Active Model'}</span>
                                    </>
                                  )}
                                </button>

                                {modelAnalysis && (
                                  <button
                                    onClick={unloadModel}
                                    className="p-6 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                                    title="Unload Model"
                                  >
                                    <Trash2 size={20} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Panel 2: Recommendations */}
                  <div className={cn(
                    "glass-card transition-all duration-500 overflow-hidden",
                    expandedPanel === 'recommendations' ? "border-silver/20 shadow-[0_0_60px_rgba(255,255,255,0.02)]" : "border-white/5 opacity-60 hover:opacity-100"
                  )}>
                    <button 
                      onClick={() => setExpandedPanel('recommendations')}
                      className="w-full flex items-center justify-between p-8 md:p-10 text-left focus:outline-none group"
                    >
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                          expandedPanel === 'recommendations' ? "bg-silver/10 text-silver rotate-0" : "bg-white/5 text-white/20 rotate-[10deg] group-hover:rotate-0"
                        )}>
                          <Sparkles size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-light tracking-tight text-white">Hardware-Aware <span className="text-white/20 italic">Recommendations</span></h3>
                          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mt-1">Curated suggestions for your system profile</p>
                        </div>
                      </div>
                      <div className={cn("transition-transform duration-500", expandedPanel === 'recommendations' ? "rotate-180 text-silver" : "text-white/20")}>
                        <ChevronDown size={20} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedPanel === 'recommendations' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <div className="px-8 md:px-10 pb-10 flex flex-col gap-8 border-t border-white/5 pt-8">
                            {!systemProfile ? (
                              <div className="py-12 flex flex-col items-center justify-center gap-4">
                                <RefreshCcw size={24} className="text-white/10 animate-spin" />
                                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">Analyzing hardware constraints...</p>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                  <p className="text-xs text-white/30 leading-relaxed max-w-lg">
                                    Hugging Face models scored against your device — 
                                    <span className="text-white/50 font-mono"> {systemProfile.ram_available_gb?.toFixed(1) || systemProfile.ram_gb} GB Avail</span>, 
                                    <span className="text-white/50 font-mono"> {systemProfile.dgpu_name !== 'None' ? systemProfile.dgpu_name : systemProfile.gpu_name !== 'None' ? systemProfile.gpu_name : 'No dGPU found'}</span>.
                                  </p>
                                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-silver/5 border border-silver/10 text-silver text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm">
                                    <Cpu size={12} /> {systemProfile.gpu_backend?.toUpperCase() || "CPU"} Backend
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-4 items-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald" />
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Optimal</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-yellow-400" />
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Tight Fit</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-red-400" />
                                    <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Incompatible</span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-10">
                                  {/* Optimal Section */}
                                  {getHFRecommendations().optimal.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-[1px] flex-1 bg-emerald/20" />
                                        <span className="text-[10px] font-mono text-emerald/60 uppercase tracking-[0.3em]">Optimal Models</span>
                                        <div className="h-[1px] flex-1 bg-emerald/20" />
                                      </div>
                                      <div className="grid grid-cols-1 gap-4">
                                        {getHFRecommendations().optimal.map((model, idx) => (
                                          <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Tight Fit Section */}
                                  {getHFRecommendations().tight.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-[1px] flex-1 bg-yellow-500/20" />
                                        <span className="text-[10px] font-mono text-yellow-500/60 uppercase tracking-[0.3em]">Tight Fit Models</span>
                                        <div className="h-[1px] flex-1 bg-yellow-500/20" />
                                      </div>
                                      <div className="grid grid-cols-1 gap-4">
                                        {getHFRecommendations().tight.map((model, idx) => (
                                          <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Incompatible Section */}
                                  {getHFRecommendations().heavy.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <div className="flex items-center gap-3">
                                        <div className="h-[1px] flex-1 bg-red-500/20" />
                                        <span className="text-[10px] font-mono text-red-500/60 uppercase tracking-[0.3em]">Incompatible Models</span>
                                        <div className="h-[1px] flex-1 bg-red-500/20" />
                                      </div>
                                      <div className="grid grid-cols-1 gap-4">
                                        {getHFRecommendations().heavy.map((model, idx) => (
                                          <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
