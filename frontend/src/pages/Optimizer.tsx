import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Target, Settings, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

export const Optimizer = () => {
  const { systemProfile, modelAnalysis, goal, setGoal, setStrategy } = useStore();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const generateStrategy = async () => {
    if (!systemProfile) return;
    setLoading(true);
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
      navigate('/results');
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const isReady = !!systemProfile;

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-white">Optimization Engine</h1>
        <p className="text-luxury-mono mt-4 text-white/40">Benchmarking & Tuning Configuration</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        {/* Main Canvas */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          <div className="glass-card p-8 flex flex-col gap-8">
            <div>
              <h3 className="text-luxury-mono mb-4">Optimization Target</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {['latency', 'memory', 'accuracy'].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGoal(g)}
                    className={`p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all ${
                      goal === g 
                        ? 'bg-white/10 border-white/30 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]' 
                        : 'bg-black/40 border-white/5 hover:bg-white/5'
                    }`}
                  >
                    <Target size={20} className={goal === g ? 'text-white' : 'text-white/30'} />
                    <span className="font-mono text-xs tracking-widest uppercase text-white/80">{g}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <button
                onClick={generateStrategy}
                disabled={loading || !isReady}
                className="w-full py-6 rounded-xl bg-white text-black font-sans font-bold text-lg hover:bg-silver transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap size={20} /> Compile Strategy
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
              {!isReady && (
                <p className="text-red-400 font-mono text-[10px] uppercase tracking-widest mt-4 text-center">
                  System Profiler must be run first.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel (Slide-in / Utility) */}
        <div className="col-span-1 md:col-span-4">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-mono mb-6 flex items-center gap-2">
              <Settings size={14} className="text-white/40" /> Advanced Options
            </h3>
            <div className="flex flex-col gap-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="font-mono text-xs text-white/60 group-hover:text-white transition-colors">Force INT8 Quantization</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" />
                  <div className="w-10 h-6 rounded-full bg-white/10 transition-colors group-hover:bg-white/20" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white/50 rounded-full transition-transform" />
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="font-mono text-xs text-white/60 group-hover:text-white transition-colors">Disable Autotuner</span>
                <div className="relative">
                  <input type="checkbox" className="sr-only" />
                  <div className="w-10 h-6 rounded-full bg-white/10 transition-colors group-hover:bg-white/20" />
                  <div className="absolute top-1 left-1 w-4 h-4 bg-white/50 rounded-full transition-transform" />
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};