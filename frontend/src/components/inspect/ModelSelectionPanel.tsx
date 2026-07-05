import { motion, AnimatePresence } from 'framer-motion';
import { FolderOpen, Link2, Search, RefreshCcw, Trash2, Database, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';
import { DownloadedModelCard } from './DownloadedModelCard';

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

export const ModelSelectionPanel = ({
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
