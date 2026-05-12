import { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Search, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const ModelAnalysis = () => {
  const { modelAnalysis, setModelAnalysis, modelPath, setModelPath } = useStore();
  const [loading, setLoading] = useState(false);
  const [unsafeLoad, setUnsafeLoad] = useState(false);

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
      setModelAnalysis(data.analysis);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-luxury-header !text-4xl md:!text-6xl">Model Inspection</h1>
        <p className="text-luxury-subheading mt-4 text-white/40 !text-base">Serialization & architectural profiling</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        {/* Main Canvas */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          <div className="glass-card p-8 flex flex-col gap-4">
            <label className="text-luxury-mono">Model Path</label>
            <div className="relative flex gap-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={modelPath}
                  onChange={(e) => setModelPath(e.target.value)}
                  placeholder="/path/to/model.pt"
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all"
                />
                <Database className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
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
                className="px-6 py-4 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs tracking-widest uppercase hover:bg-white/10 transition-all"
              >
                Browse
              </button>
            </div>
            <button
              onClick={analyzeModel}
              disabled={loading || !modelPath}
              className="mt-4 px-8 py-4 rounded-xl bg-white text-black font-mono text-xs tracking-widest uppercase hover:bg-silver transition-all flex items-center justify-center gap-2 self-start"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-black/40 border-t-black rounded-full animate-spin" />
              ) : (
                <>
                  <Search size={14} /> Inspect Model
                </>
              )}
            </button>

            {modelAnalysis && (
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/model/unload', { method: 'POST' });
                  } catch (e) {
                    console.error('Unload failed', e);
                  }
                  setModelAnalysis(null);
                  setModelPath('');
                }}
                className="mt-4 px-8 py-4 rounded-xl bg-red-500/10 text-red-400 font-mono text-xs tracking-widest uppercase hover:bg-red-500/20 transition-all flex items-center justify-center gap-2 self-start border border-red-500/20"
              >
                <Trash2 size={14} /> Unload Model
              </button>
            )}
          </div>

          {modelAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <h3 className="text-luxury-subheading mb-8 !text-lg">Structural Diagnostics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Total Parameters</div>
                  <div className="font-mono text-xl text-emerald">{(modelAnalysis.num_params || 0).toLocaleString()}</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-1">Total Size</div>
                  <div className="font-mono text-xl text-white">{(modelAnalysis.size_mb || 0).toFixed(2)} MB</div>
                </div>
                <div className="bg-black/40 p-4 rounded-xl border border-white/5 col-span-2">
                  <div className="text-white/40 text-[10px] uppercase font-bold tracking-widest mb-2">Layer Composition</div>
                  <div className="flex flex-wrap gap-2">
                    {modelAnalysis.layer_types ? Object.entries(modelAnalysis.layer_types).map(([type, count]) => (
                      <span key={type} className="px-3 py-1 bg-white/5 rounded-md font-mono text-xs text-white/70">
                        {type}: <span className="text-white">{count as any}</span>
                      </span>
                    )) : <span className="text-white/20 text-xs italic">No layer data available</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel (Slide-in / Utility) */}
        <div className="col-span-1 md:col-span-4">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-subheading mb-6 text-red-400 !text-lg">Security / Advanced</h3>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={unsafeLoad}
                  onChange={(e) => setUnsafeLoad(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${unsafeLoad ? 'bg-red-500' : 'bg-white/10'}`} />
                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${unsafeLoad ? 'translate-x-4' : 'translate-x-0'}`} />
              </div>
              <span className="font-mono text-xs text-white/60 group-hover:text-white transition-colors">Enable Unsafe Load (Pickle)</span>
            </label>
            <p className="text-[10px] text-white/30 mt-4 leading-relaxed font-mono">
              Warning: Enabling this allows the execution of arbitrary code during serialization. Only use with trusted models.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};