import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, ShieldAlert, Cpu, HardDrive, Activity,
  Stethoscope, CheckCircle2, AlertCircle
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { DiagnoseTab } from '../components/DiagnoseTab';
import { TuneTab } from '../components/TuneTab';
import { InspectTab } from '../components/InspectTab';

// --- Sub-Components ---

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
  const [loadingModelId, setLoadingModelId] = useState<string | null>(null);
  const isClickLocked = useRef(false);
  const [unsafeLoad, setUnsafeLoad] = useState(false);
  const [activeMode, setActiveTabMode] = useState<'path' | 'lmstudio'>('path');
  const [selectedClient, setSelectedClient] = useState<'lmstudio' | 'ollama'>('lmstudio');
  const [expandedPanel, setExpandedPanel] = useState<'selection' | 'recommendations' | null>('selection');
  const [hubTab, setHubTab] = useState<'inspect' | 'diagnose' | 'tune'>('inspect');

  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  const fetchSystemProfile = async () => {
    try {
      const profile = await api.getSystemProfile();
      setSystemProfile(profile);
    } catch (e) {
      console.error('Failed to fetch system profile', e);
    }
  };

  const fetchRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const recs = await api.getModelRecommendations();
      setRecommendations(recs);
    } catch (e) {
      console.error('Failed to fetch recommendations', e);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    if (!systemProfile) {
      fetchSystemProfile();
    }
  }, []);

  useEffect(() => {
    if (systemProfile) {
      fetchRecommendations();
    }
  }, [systemProfile]);

  // --- Handlers ---

  const fetchClientModels = async () => {
    setLoading(true);
    try {
      const clientPrefix = selectedClient === 'lmstudio' ? 'lmstudio' : 'ollama';
      const models = await api.listRuntimeModels(clientPrefix, lmStudioHost, lmStudioPort);
      setAvailableModels(models);
    } catch (e: any) {
      addNotification({ 
        type: 'error', 
        title: 'Fetch Failed', 
        message: `Could not list ${selectedClient === 'lmstudio' ? 'LM Studio' : 'Ollama'} models` 
      });
    }
    setLoading(false);
  };

  const loadClientModel = async (modelId: string) => {
    setLoadingModelId(modelId);
    setLoading(true);
    try {
      const clientPrefix = selectedClient === 'lmstudio' ? 'lmstudio' : 'ollama';
      await api.loadRuntimeModel(clientPrefix, lmStudioHost, lmStudioPort, modelId);
      addNotification({ type: 'success', title: 'Model Loaded', message: `Model ${modelId} is now active` });
      await syncClient(modelId); // Sync metadata for this specific loaded model
      await fetchClientModels(); // Refresh downloaded models list to update loaded flags
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Load Failed', message: e.message });
    } finally {
      setLoadingModelId(null);
      setLoading(false);
    }
  };

  const handleModelClick = async (model: any) => {
    if (isClickLocked.current) return;
    isClickLocked.current = true;
    try {
      const modelIdentifier = model.model_id || model.model_name;
      if (model.loaded) {
        await syncClient(modelIdentifier);
      } else {
        await loadClientModel(modelIdentifier);
      }
    } finally {
      isClickLocked.current = false;
    }
  };

  const unloadModel = async () => {
    setLoading(true);
    try {
      await api.unloadModel(modelAnalysis?.model_id || modelAnalysis?.model_name);
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
      const data = await api.analyzeModel(modelPath, unsafeLoad);
      setModelAnalysis(data.analysis);
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Analysis Error', message: e.message });
    }
    setLoading(false);
  };

  const syncClient = async (modelId?: string | any) => {
    const targetModelId = typeof modelId === 'string' ? modelId : undefined;
    setLoading(true);
    try {
      const clientPrefix = selectedClient === 'lmstudio' ? 'lmstudio' : 'ollama';
      const analysis = await api.syncRuntimeModel(clientPrefix, lmStudioHost, lmStudioPort, targetModelId);
      setModelAnalysis(analysis);
      if (analysis.path) setModelPath(analysis.path);
      addNotification({ 
        type: 'success', 
        title: targetModelId ? 'Model Activated' : 'Client Synced', 
        message: targetModelId 
          ? `Switched active model to: ${analysis.model_name}` 
          : `Connected to model: ${analysis.model_name}` 
      });
      await fetchClientModels(); // Refresh availableModels to update loaded flags
    } catch (e: any) {
      addNotification({ 
        type: 'error', 
        title: 'Connection Failed', 
        message: e.message 
      });
    }
    setLoading(false);
  };

  const runDiagnostics = async () => {
    if (!modelPath) return;
    setIsDiagnosing(true);
    setDiagnosticFindings([]);
    try {
      await api.streamDiagnostic(modelPath, unsafeLoad, (data) => {
        if (data.status === 'complete') {
          setDiagnosticFindings(data.findings);
          setIsDiagnosing(false);
        }
      });
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
      await api.streamRuntimeTune(
        modelAnalysis.model_name,
        modelAnalysis.external_source || 'local',
        systemProfile || { device: 'cpu' },
        (data) => {
          if (data.status === 'complete') {
            setOptimalRuntimeConfig(data.optimal_config);
            setIsRuntimeTuning(false);
          } else {
            setRuntimeTuningProgress(prev => [...prev, data]);
          }
        }
      );
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

      <div className="relative z-10 pt-10 pb-24 md:pt-14 md:pb-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full flex flex-col gap-8 md:gap-12">
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
                  <InspectTab
                    modelAnalysis={modelAnalysis}
                    modelPath={modelPath}
                    setModelPath={setModelPath}
                    activeMode={activeMode}
                    setActiveTabMode={setActiveTabMode}
                    selectedClient={selectedClient}
                    setSelectedClient={setSelectedClient}
                    expandedPanel={expandedPanel}
                    setExpandedPanel={setExpandedPanel}
                    recommendations={recommendations}
                    loadingRecommendations={loadingRecommendations}
                    loading={loading}
                    loadingModelId={loadingModelId}
                    availableModels={availableModels}
                    lmStudioHost={lmStudioHost}
                    setLmStudioHost={setLmStudioHost}
                    lmStudioPort={lmStudioPort}
                    setLmStudioPort={setLmStudioPort}
                    systemProfile={systemProfile}
                    analyzeModel={analyzeModel}
                    syncClient={syncClient}
                    unloadModel={unloadModel}
                    handleModelClick={handleModelClick}
                    fetchClientModels={fetchClientModels}
                  />
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
                  <DiagnoseTab
                    modelAnalysis={modelAnalysis}
                    isDiagnosing={isDiagnosing}
                    diagnosticFindings={diagnosticFindings}
                    runDiagnostics={runDiagnostics}
                  />
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
                  <TuneTab
                    modelAnalysis={modelAnalysis}
                    isRuntimeTuning={isRuntimeTuning}
                    runtimeTuningProgress={runtimeTuningProgress}
                    optimalRuntimeConfig={optimalRuntimeConfig}
                    runRuntimeTuner={runRuntimeTuner}
                  />
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
