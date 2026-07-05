import { motion, AnimatePresence } from 'framer-motion';
import { Database, Sparkles, ChevronDown, Cpu, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';
import { ModelSelectionPanel } from './inspect/ModelSelectionPanel';
import { HardwareRecommendationsPanel } from './inspect/HardwareRecommendationsPanel';

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


