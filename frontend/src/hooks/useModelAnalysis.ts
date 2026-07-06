import { useState, useEffect, useRef } from 'react';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';

export const useModelAnalysis = () => {
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
      await syncClient(modelId);
      await fetchClientModels();
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
      await fetchClientModels();
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

  return {
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
    fetchSystemProfile,
    fetchRecommendations,
    fetchClientModels,
    loadClientModel,
    handleModelClick,
    unloadModel,
    analyzeModel,
    syncClient,
    runDiagnostics,
    runRuntimeTuner
  };
};
