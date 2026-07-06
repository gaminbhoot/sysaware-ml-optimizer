import { motion, AnimatePresence } from 'framer-motion';
import { 
  Database, Search, Cpu, HardDrive, Activity, Stethoscope
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';
import { DiagnoseTab } from '../components/DiagnoseTab';
import { TuneTab } from '../components/TuneTab';
import { InspectTab } from '../components/InspectTab';

import { useModelAnalysis } from '../hooks/useModelAnalysis';
import { StatsCard } from '../components/model/StatsCard';
import { HubSidebarPanels } from '../components/model/HubSidebarPanels';

export const ModelAnalysis = () => {
  const { goal } = useStore();
  const {
    modelAnalysis,
    modelPath,
    setModelPath,
    activeMode,
    setActiveTabMode,
    selectedClient,
    setSelectedClient,
    expandedPanel,
    setExpandedPanel,
    hubTab,
    setHubTab,
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
    isDiagnosing,
    diagnosticFindings,
    isRuntimeTuning,
    runtimeTuningProgress,
    optimalRuntimeConfig,
    unsafeLoad,
    setUnsafeLoad,
    analyzeModel,
    syncClient,
    unloadModel,
    handleModelClick,
    fetchClientModels,
    runDiagnostics,
    runRuntimeTuner
  } = useModelAnalysis();

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

        {/* Analytics Overview */}
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
            <HubSidebarPanels
              modelAnalysis={modelAnalysis}
              modelPath={modelPath}
              systemProfile={systemProfile}
              goal={goal}
              unsafeLoad={unsafeLoad}
              setUnsafeLoad={setUnsafeLoad}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};
