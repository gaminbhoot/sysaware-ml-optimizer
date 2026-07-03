import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, FolderOpen, Link2, RefreshCcw, Trash2, 
  Search, Globe, Sparkles, ChevronDown, Cpu, HardDrive, Zap,
  CheckCircle2, ExternalLink
} from 'lucide-react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';

const ModelCard = ({ model, idx, systemProfile }: { model: any, idx: number, systemProfile: any }) => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: idx * 0.05 }}
    className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
  >
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-mono font-medium text-white truncate max-w-[240px] sm:max-w-md">{model.name}</span>
          {model.status === 'perfect' && (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-emerald/10 text-emerald uppercase tracking-wider font-semibold">Optimal</span>
          )}
          {model.status === 'caution' && (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 uppercase tracking-wider font-semibold">Caution</span>
          )}
          {model.status === 'incompatible' && (
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

const DownloadedModelCard = ({ 
  model, 
  modelAnalysis, 
  loadingModelId, 
  loading, 
  onModelClick 
}: { 
  model: any; 
  modelAnalysis: any; 
  loadingModelId: string | null; 
  loading: boolean; 
  onModelClick: (model: any) => void;
}) => {
  const modelIdentifier = model.model_id || model.model_name;
  const isActive = !!modelAnalysis && (
    (!!modelAnalysis.base_id && modelAnalysis.base_id === model.base_id) ||
    (!!modelAnalysis.model_id && modelAnalysis.model_id === model.model_id) ||
    (!!modelAnalysis.model_name && modelAnalysis.model_name === model.model_name)
  );
  const isLoaded = model.loaded;
  const isThisModelLoading = loadingModelId === modelIdentifier;
  const isDisabled = (loadingModelId !== null && !isThisModelLoading) || loading;

  let cardStyle = "";
  let Badge = null;
  let RightIcon = null;

  if (isActive) {
    cardStyle = "bg-emerald/10 border-emerald/40 text-emerald shadow-[0_0_15px_rgba(16,185,129,0.15)]";
    Badge = <span className="px-1.5 py-0.5 rounded bg-emerald/20 text-emerald text-[8px] font-mono tracking-wider uppercase font-bold">Active</span>;
    RightIcon = <CheckCircle2 size={12} className="flex-shrink-0" />;
  } else if (isThisModelLoading) {
    cardStyle = "bg-white/[0.02] border-white/20 text-white/80 animate-pulse cursor-wait";
    Badge = <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[8px] font-mono tracking-wider uppercase">Loading...</span>;
    RightIcon = <RefreshCcw size={12} className="animate-spin text-white/40 flex-shrink-0" />;
  } else if (isLoaded) {
    cardStyle = "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/15";
    Badge = <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-mono tracking-wider uppercase">Loaded</span>;
    RightIcon = (
      <div className="flex items-center gap-1.5">
        <Database size={12} className="text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
        <span className="text-[8px] font-mono tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/20 px-1 py-0.5 rounded text-blue-300">Activate</span>
      </div>
    );
  } else {
    cardStyle = "bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";
    RightIcon = <Zap size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-white/40" />;
  }

  return (
    <button
      onClick={() => !isActive && !isDisabled && onModelClick(model)}
      disabled={isDisabled}
      className={cn(
        "p-3 rounded-lg border text-left transition-all group flex items-center justify-between",
        cardStyle,
        isDisabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="text-[10px] font-medium truncate">{model.model_name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono opacity-40 uppercase">
            {model.num_params ? `${(model.num_params / 1e9).toFixed(1)}B Params` : '0.0B Params'}
          </span>
          {Badge}
        </div>
      </div>
      {RightIcon}
    </button>
  );
};

interface InspectTabProps {
  modelAnalysis: any;
  modelPath: string;
  setModelPath: (p: string) => void;
  activeMode: 'path' | 'lmstudio';
  setActiveTabMode: (m: 'path' | 'lmstudio') => void;
  selectedClient: 'lmstudio' | 'ollama';
  setSelectedClient: (c: 'lmstudio' | 'ollama') => void;
  expandedPanel: 'selection' | 'recommendations' | null;
  setExpandedPanel: React.Dispatch<React.SetStateAction<'selection' | 'recommendations' | null>>;
  recommendations: any[];
  loadingRecommendations: boolean;
  loading: boolean;
  loadingModelId: string | null;
  availableModels: any[];
  lmStudioHost: string;
  setLmStudioHost: (h: string) => void;
  lmStudioPort: number;
  setLmStudioPort: (p: number) => void;
  systemProfile: any;
  analyzeModel: () => Promise<void>;
  syncClient: (forcePort?: number) => Promise<void>;
  unloadModel: () => Promise<void>;
  handleModelClick: (model: any) => Promise<void>;
  fetchClientModels: () => Promise<void>;
}

interface ModelSelectionPanelProps {
  modelPath: string;
  setModelPath: (p: string) => void;
  activeMode: 'path' | 'lmstudio';
  setActiveTabMode: (m: 'path' | 'lmstudio') => void;
  selectedClient: 'lmstudio' | 'ollama';
  setSelectedClient: (c: 'lmstudio' | 'ollama') => void;
  availableModels: any[];
  lmStudioHost: string;
  setLmStudioHost: (h: string) => void;
  lmStudioPort: number;
  setLmStudioPort: (p: number) => void;
  modelAnalysis: any;
  loadingModelId: string | null;
  loading: boolean;
  analyzeModel: () => Promise<void>;
  syncClient: (forcePort?: number) => Promise<void>;
  unloadModel: () => Promise<void>;
  handleModelClick: (model: any) => Promise<void>;
  fetchClientModels: () => Promise<void>;
}

const ModelSelectionPanel = ({
  modelPath,
  setModelPath,
  activeMode,
  setActiveTabMode,
  selectedClient,
  setSelectedClient,
  availableModels,
  lmStudioHost,
  setLmStudioHost,
  lmStudioPort,
  setLmStudioPort,
  modelAnalysis,
  loadingModelId,
  loading,
  analyzeModel,
  syncClient,
  unloadModel,
  handleModelClick,
  fetchClientModels
}: ModelSelectionPanelProps) => {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-6 md:px-8 pb-8 pt-6 flex flex-col gap-6 border-t border-white/5">
        {/* Inner Tabs & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Inner Tabs: Path vs LM Studio */}
          <div className="flex p-1 bg-white/[0.03] rounded-xl gap-1 w-full sm:max-w-xs md:max-w-md">
            <button 
              onClick={() => setActiveTabMode('path')}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all",
                activeMode === 'path' ? "bg-white/10 text-white border border-white/10" : "text-white/40 hover:text-white"
              )}
            >
              <FolderOpen size={12} /> Filesystem
            </button>
            <button 
              onClick={() => setActiveTabMode('lmstudio')}
              className={cn(
                "flex-1 flex items-center justify-center gap-3 py-2.5 rounded-lg font-mono text-[9px] uppercase tracking-widest transition-all",
                activeMode === 'lmstudio' ? "bg-white/10 text-white border border-white/10" : "text-white/40 hover:text-white"
              )}
            >
              <Link2 size={12} /> Client Bridge
            </button>
          </div>

          {/* Tab Actions */}
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={activeMode === 'path' ? analyzeModel : () => syncClient()}
              disabled={loading || (activeMode === 'path' ? !modelPath : !lmStudioHost)}
              className={cn(
                "group relative flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-mono text-[9px] uppercase tracking-[0.15em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 h-10",
                activeMode === 'path' ? "bg-white text-black" : "bg-emerald text-black"
              )}
            >
              {loading ? (
                <div className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  {activeMode === 'path' ? <Search size={14} /> : <RefreshCcw size={14} className="group-hover:rotate-180 transition-transform duration-500" />}
                  <span>{activeMode === 'path' ? 'Inspect Model' : 'Sync Active Model'}</span>
                </>
              )}
            </button>

            {modelAnalysis && (
              <button
                onClick={unloadModel}
                className="p-3 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20 h-10 w-10 flex items-center justify-center"
                title="Unload Model"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>

        {activeMode === 'path' ? (
          <div className="flex flex-col gap-3">
            <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/40">Model Filesystem Path</label>
            <div className="relative flex items-center gap-3">
              <div className="relative flex-1 group/input">
                <input
                  type="text"
                  value={modelPath}
                  onChange={(e) => setModelPath(e.target.value)}
                  placeholder="/Volumes/Storage/Models/llama-3-8b.safetensors"
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-white font-mono text-xs focus:outline-none focus:border-emerald/40 focus:ring-1 focus:ring-emerald/10 transition-all placeholder:text-white/20 h-10"
                />
                <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald transition-colors" size={16} />
              </div>
              <button
                onClick={async () => {
                  try {
                    const path = await api.browseModels();
                    if (path) {
                      setModelPath(path);
                    }
                  } catch (e) {
                    console.error('Browse failed', e);
                  }
                }}
                className="flex items-center justify-center gap-2 px-5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-[9px] uppercase tracking-widest hover:bg-white/10 hover:border-white/20 transition-all active:scale-95 h-10"
              >
                <FolderOpen size={14} />
                Browse
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              {/* Client Backend */}
              <div className="md:col-span-3 flex flex-col gap-1.5">
                <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/30">Client Backend</label>
                <select
                  value={selectedClient}
                  onChange={(e) => {
                    const val = e.target.value as 'lmstudio' | 'ollama';
                    setSelectedClient(val);
                    setLmStudioPort(val === 'lmstudio' ? 1234 : 11434);
                  }}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs font-mono text-white/80 focus:outline-none focus:border-emerald/40 focus:ring-1 focus:ring-emerald/10 transition-all cursor-pointer h-10"
                >
                  <option value="lmstudio">LM Studio</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              {/* Server Host */}
              <div className="md:col-span-5 flex flex-col gap-1.5 group/input">
                <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/30">
                  {selectedClient === 'lmstudio' ? 'LM Studio' : 'Ollama'} Host
                </label>
                <div className="relative w-full">
                  <input
                    type="text"
                    value={lmStudioHost}
                    onChange={(e) => setLmStudioHost(e.target.value)}
                    placeholder="127.0.0.1"
                    className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-white font-mono text-xs focus:outline-none focus:border-emerald/40 focus:ring-1 focus:ring-emerald/10 transition-all placeholder:text-white/20 h-10"
                  />
                  <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald transition-colors" size={14} />
                </div>
              </div>

              {/* Port */}
              <div className="md:col-span-2 flex flex-col gap-1.5">
                <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/30">Port</label>
                <input
                  type="number"
                  value={lmStudioPort}
                  onChange={(e) => setLmStudioPort(parseInt(e.target.value) || 0)}
                  placeholder={selectedClient === 'lmstudio' ? "1234" : "11434"}
                  className="w-full bg-black/40 border border-white/5 rounded-xl py-2.5 px-4 text-white font-mono text-xs focus:outline-none focus:border-emerald/40 focus:ring-1 focus:ring-emerald/10 transition-all placeholder:text-white/20 h-10"
                />
              </div>

              {/* Sync Library */}
              <div className="md:col-span-2">
                <button 
                  onClick={fetchClientModels}
                  className="w-full h-10 flex items-center justify-center gap-2 px-3 rounded-xl bg-emerald/10 border border-emerald/20 text-emerald font-mono text-[9px] uppercase tracking-widest hover:bg-emerald/15 hover:border-emerald/30 active:scale-95 transition-all"
                >
                  <RefreshCcw size={12} className={loading ? "animate-spin" : ""} /> Sync
                </button>
              </div>
            </div>

            {/* Available Models List */}
            <AnimatePresence>
              {availableModels.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex flex-col gap-2 overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-luxury-mono text-[9px] tracking-widest uppercase text-white/20">Downloaded Models</label>
                    <span className="text-[9px] font-mono text-white/20">{availableModels.length} found</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[190px] overflow-y-auto pr-1">
                    {availableModels.map((model) => (
                      <DownloadedModelCard
                        key={model.model_id || model.model_name}
                        model={model}
                        modelAnalysis={modelAnalysis}
                        loadingModelId={loadingModelId}
                        loading={loading}
                        onModelClick={handleModelClick}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface HardwareRecommendationsPanelProps {
  systemProfile: any;
  loadingRecommendations: boolean;
  recommendations: any[];
}

const HardwareRecommendationsPanel = ({
  systemProfile,
  loadingRecommendations,
  recommendations
}: HardwareRecommendationsPanelProps) => {
  const getHFRecommendations = () => {
    const ram = systemProfile?.ram_gb || 8;
    const isMac = systemProfile?.os?.toLowerCase().includes('mac') || systemProfile?.os?.toLowerCase().includes('darwin');
    const isMetal = systemProfile?.gpu_backend?.toLowerCase() === 'metal' || isMac;

    const allModels = recommendations;

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
        return b.ramNeeded - a.ramNeeded;
      }),
      tight: processed.filter(m => m.status === 'caution').sort((_, b) => b.formatMatch ? 1 : -1),
      heavy: processed.filter(m => m.status === 'incompatible').sort((_, b) => b.formatMatch ? 1 : -1)
    };
  };

  const recs = getHFRecommendations();

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-8 md:px-10 pb-10 flex flex-col gap-8 border-t border-white/5 pt-8">
        {!systemProfile || loadingRecommendations ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <RefreshCcw size={24} className="text-white/10 animate-spin" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
              {!systemProfile ? "Analyzing hardware constraints..." : "Fetching live recommendations..."}
            </p>
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

            <div className="flex flex-col gap-10 max-h-[500px] overflow-y-auto pr-3">
              {/* Optimal Section */}
              {recs.optimal.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-emerald/20" />
                    <span className="text-[10px] font-mono text-emerald/60 uppercase tracking-[0.3em]">Optimal Models</span>
                    <div className="h-[1px] flex-1 bg-emerald/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.optimal.map((model, idx) => (
                      <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tight Fit Section */}
              {recs.tight.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-yellow-500/20" />
                    <span className="text-[10px] font-mono text-yellow-500/60 uppercase tracking-[0.3em]">Tight Fit Models</span>
                    <div className="h-[1px] flex-1 bg-yellow-500/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.tight.map((model, idx) => (
                      <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                    ))}
                  </div>
                </div>
              )}

              {/* Incompatible Section */}
              {recs.heavy.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-red-500/20" />
                    <span className="text-[10px] font-mono text-red-500/60 uppercase tracking-[0.3em]">Incompatible Models</span>
                    <div className="h-[1px] flex-1 bg-red-500/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.heavy.map((model, idx) => (
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
  );
};

export const InspectTab = ({
  modelAnalysis,
  modelPath,
  setModelPath,
  activeMode,
  setActiveTabMode,
  selectedClient,
  setSelectedClient,
  expandedPanel,
  setExpandedPanel,
  recommendations,
  loadingRecommendations,
  loading,
  loadingModelId,
  availableModels,
  lmStudioHost,
  setLmStudioHost,
  lmStudioPort,
  setLmStudioPort,
  systemProfile,
  analyzeModel,
  syncClient,
  unloadModel,
  handleModelClick,
  fetchClientModels
}: InspectTabProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Panel 1: Model Selection */}
      <div className={cn(
        "glass-card transition-all duration-500 overflow-hidden",
        expandedPanel === 'selection' ? "border-emerald/20 shadow-[0_0_60px_rgba(16,185,129,0.03)]" : "border-white/5 opacity-60 hover:opacity-100"
      )}>
        <button 
          onClick={() => setExpandedPanel(prev => prev === 'selection' ? null : 'selection')}
          className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none group"
        >
          <div className="flex items-center gap-6">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
              expandedPanel === 'selection' ? "bg-emerald/10 text-emerald rotate-0" : "bg-white/5 text-white/20 rotate-[-10deg] group-hover:rotate-0"
            )}>
              <Database size={24} />
            </div>
            <div>
              <h3 className="text-lg font-light tracking-tight text-white">Model <span className="text-white/20 italic">Selection</span></h3>
              <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mt-1">Ingest local assets or bridge external client</p>
            </div>
          </div>
          <div className={cn("transition-transform duration-500", expandedPanel === 'selection' ? "rotate-180 text-emerald" : "text-white/20")}>
            <ChevronDown size={20} />
          </div>
        </button>

        <AnimatePresence>
          {expandedPanel === 'selection' && (
            <ModelSelectionPanel
              modelPath={modelPath}
              setModelPath={setModelPath}
              activeMode={activeMode}
              setActiveTabMode={setActiveTabMode}
              selectedClient={selectedClient}
              setSelectedClient={setSelectedClient}
              availableModels={availableModels}
              lmStudioHost={lmStudioHost}
              setLmStudioHost={setLmStudioHost}
              lmStudioPort={lmStudioPort}
              setLmStudioPort={setLmStudioPort}
              modelAnalysis={modelAnalysis}
              loadingModelId={loadingModelId}
              loading={loading}
              analyzeModel={analyzeModel}
              syncClient={syncClient}
              unloadModel={unloadModel}
              handleModelClick={handleModelClick}
              fetchClientModels={fetchClientModels}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Panel 2: Recommendations */}
      <div className={cn(
        "glass-card transition-all duration-500 overflow-hidden",
        expandedPanel === 'recommendations' ? "border-silver/20 shadow-[0_0_60px_rgba(255,255,255,0.02)]" : "border-white/5 opacity-60 hover:opacity-100"
      )}>
        <button 
          onClick={() => setExpandedPanel(prev => prev === 'recommendations' ? null : 'recommendations')}
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
            <HardwareRecommendationsPanel
              systemProfile={systemProfile}
              loadingRecommendations={loadingRecommendations}
              recommendations={recommendations}
            />
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
    </div>
  );
};
