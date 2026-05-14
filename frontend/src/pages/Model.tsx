import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Search, Trash2, ShieldAlert, Cpu, HardDrive, Info, ChevronRight, FolderOpen, Link2, Globe, RefreshCcw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';

export const ModelAnalysis = () => {
  const { modelAnalysis, setModelAnalysis, modelPath, setModelPath, lmStudioHost, setLmStudioHost } = useStore();
  const { addNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [unsafeLoad, setUnsafeLoad] = useState(false);
  const [activeMode, setActiveTabMode] = useState<'path' | 'lmstudio'>('path');

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
        body: JSON.stringify({ host: lmStudioHost, port: 1234 })
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

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30">
      <div className="pt-24 pb-32 md:pt-32 md:pb-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full flex flex-col gap-8 md:gap-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-luxury-header mb-4">Model Inspection</h1>
          <p className="text-luxury-subheading text-white/40 max-w-2xl">
            Detect and profile models via local filesystem or active LM Studio server instances.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Content Area */}
          <motion.div 
            className="lg:col-span-8 flex flex-col gap-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            {/* Input Selection Card */}
            <div className="glass-card p-2 relative overflow-hidden group mb-2">
               <div className="flex p-1 bg-white/[0.03] rounded-xl gap-1">
                  <button 
                    onClick={() => setActiveTabMode('path')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${activeMode === 'path' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    <FolderOpen size={14} /> Local Filesystem
                  </button>
                  <button 
                    onClick={() => setActiveTabMode('lmstudio')}
                    className={`flex-1 flex items-center justify-center gap-3 py-3 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${activeMode === 'lmstudio' ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
                  >
                    <Link2 size={14} /> LM Studio Bridge
                  </button>
               </div>
            </div>

            {/* Input Card */}
            <div className="glass-card p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-[100px] -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-white/10" />
              
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
                          className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/10"
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
                        className="flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95 shadow-xl"
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
                          className="w-full bg-black/40 border border-white/5 rounded-2xl py-5 pl-14 pr-6 text-white font-mono text-sm focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all placeholder:text-white/10"
                        />
                        <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within/input:text-emerald transition-colors" size={20} />
                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/20 uppercase tracking-tighter">:1234</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center gap-4">
                    {activeMode === 'path' ? (
                      <button
                        onClick={analyzeModel}
                        disabled={loading || !modelPath}
                        className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-white text-black rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            <Search size={16} />
                            <span>Inspect Model</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={syncLMStudio}
                        disabled={loading || !lmStudioHost}
                        className="group relative flex items-center justify-center gap-3 px-10 py-5 bg-emerald text-black rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                        ) : (
                          <>
                            <RefreshCcw size={16} className="group-hover:rotate-180 transition-transform duration-500" />
                            <span>Sync with Studio</span>
                          </>
                        )}
                      </button>
                    )}

                    {modelAnalysis && (
                      <button
                        onClick={() => {
                          setModelAnalysis(null);
                          if (activeMode === 'path') setModelPath('');
                        }}
                        className="p-5 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"
                        title="Unload Model"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Analysis Results */}
            <AnimatePresence mode="wait">
              {modelAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-8 border-emerald/20 relative overflow-hidden group">
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald/5 blur-[50px] pointer-events-none" />
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-emerald/10 rounded-2xl">
                          <Cpu size={24} className="text-emerald" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Total Parameters</div>
                          <div className="font-mono text-3xl text-white tracking-tighter">
                            {(modelAnalysis.num_params || 0).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-emerald"
                          initial={{ width: 0 }}
                          animate={{ width: '70%' }}
                          transition={{ duration: 1, delay: 0.5 }}
                        />
                      </div>
                    </div>

                    <div className="glass-card p-8 border-silver/20 relative overflow-hidden group">
                      <div className="absolute bottom-0 right-0 w-32 h-32 bg-silver/5 blur-[50px] pointer-events-none" />
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-3 bg-silver/10 rounded-2xl">
                          <HardDrive size={24} className="text-silver" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-mono text-white/30 uppercase tracking-[0.2em] mb-1">Disk Footprint</div>
                          <div className="font-mono text-3xl text-white tracking-tighter truncate">
                            {(modelAnalysis.size_mb || 0).toFixed(2)} <span className="text-sm text-white/30">MB</span>
                          </div>
                        </div>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-silver"
                          initial={{ width: 0 }}
                          animate={{ width: '45%' }}
                          transition={{ duration: 1, delay: 0.7 }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-luxury-mono text-xs uppercase tracking-widest flex items-center gap-2">
                        <ChevronRight size={14} className="text-emerald" /> Structural Composition
                      </h3>
                      <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-mono text-white/30">
                        {Object.keys(modelAnalysis.layer_types || {}).length} Unique Modules
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      {modelAnalysis.layer_types ? Object.entries(modelAnalysis.layer_types).map(([type, count], i) => (
                        <motion.div 
                          key={type}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + (i * 0.05) }}
                          className="bg-white/[0.02] border border-white/5 p-4 rounded-2xl hover:bg-white/[0.05] transition-colors"
                        >
                          <div className="text-white/20 text-[9px] font-mono uppercase truncate mb-2">{type}</div>
                          <div className="text-xl font-mono text-white/80">{count as any}</div>
                        </motion.div>
                      )) : (
                        <div className="col-span-full py-12 text-center text-white/10 font-mono text-xs italic">
                          No structural data detected
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sidebar / Security */}
          <motion.div 
            className="lg:col-span-4 flex flex-col gap-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className={`glass-card p-8 lg:sticky lg:top-32 border-white/5 transition-all duration-500 ${unsafeLoad ? 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]' : ''}`}>
              <div className="flex items-center gap-3 mb-8">
                <div className={`p-2 rounded-lg transition-colors ${unsafeLoad ? 'bg-red-500/10' : 'bg-white/5'}`}>
                  <ShieldAlert size={18} className={unsafeLoad ? 'text-red-500' : 'text-white/40'} />
                </div>
                <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Security Protocol</h3>
              </div>
              
              <div className="space-y-8">
                <div className="flex flex-col gap-4 p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-white/60">Unsafe Ingest (Pickle)</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={unsafeLoad}
                        onChange={(e) => setUnsafeLoad(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500 shadow-sm" />
                    </label>
                  </div>
                  <p className="text-[10px] font-mono text-white/20 leading-relaxed">
                    Allows arbitrary code execution during de-serialization. Disable for untrusted ` .pt ` or ` .bin ` models.
                  </p>
                </div>

                <div className="flex flex-col gap-6">
                  <div className="flex items-center gap-2">
                    <Info size={14} className="text-white/20" />
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Profiling Heuristics</span>
                  </div>
                  
                  <div className="space-y-4">
                    {[
                      { label: "Weight Quantization", value: modelAnalysis?.is_external ? modelAnalysis.model_name.split('.').pop()?.toUpperCase() : "FP16 / BF16" },
                      { label: "Tensor Verification", value: "SHA-256" },
                      { label: "Sync Source", value: modelAnalysis?.external_source || "Local" }
                    ].map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] font-mono tracking-tight">
                        <span className="text-white/20">{item.label}</span>
                        <span className="text-white/60">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {unsafeLoad && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 bg-red-500/10 rounded-xl border border-red-500/20"
                  >
                    <p className="text-[10px] font-mono text-red-500 leading-relaxed">
                      <span className="font-bold mr-1">CRITICAL:</span> Running in unsafe mode exposes the host system to potential RCE. Verified Safetensors are recommended.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
