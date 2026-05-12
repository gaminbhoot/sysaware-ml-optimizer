import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { Target, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Results = () => {
  const { strategy } = useStore();
  const navigate = useNavigate();

  if (!strategy) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <AlertCircle size={48} className="text-white/20 mb-6" />
        <h2 className="text-2xl font-sans text-white/40">No Strategy Generated</h2>
        <button 
          onClick={() => navigate('/optimizer')}
          className="mt-8 font-mono text-xs uppercase tracking-widest text-emerald hover:text-white transition-colors border border-emerald/20 px-6 py-3 rounded-full"
        >
          Return to Optimizer
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-4xl md:text-6xl font-black tracking-[-0.03em] text-white">Telemetry & Output</h1>
        <p className="text-luxury-mono mt-4 text-emerald">Optimization Strategy Compiled Successfully</p>
      </motion.div>

      <div className="grid grid-cols-1 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 md:p-12 border-emerald/20 shadow-[0_0_40px_rgba(16,185,129,0.05)]"
        >
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5">
            <div className="w-12 h-12 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
              <Target size={20} />
            </div>
            <div>
              <div className="text-luxury-mono text-white/40">Selected Device</div>
              <div className="font-sans font-bold text-2xl text-white uppercase">{strategy.device || 'CPU'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-luxury-mono mb-4">Recommended Actions</h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-emerald mt-0.5">■</span>
                  <span className="font-mono text-sm text-white/80 leading-relaxed">
                    Apply <strong className="text-white">{strategy.optimization?.toUpperCase()}</strong> optimization.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-emerald mt-0.5">■</span>
                  <span className="font-mono text-sm text-white/80 leading-relaxed">{strategy.recommendation}</span>
                </li>
                {strategy.rationale && (
                  <li className="flex items-start gap-3">
                    <span className="text-emerald mt-0.5">■</span>
                    <span className="font-mono text-xs text-white/40 leading-relaxed italic">{strategy.rationale}</span>
                  </li>
                )}
              </ul>
            </div>
            
            <div className="bg-black/50 p-6 rounded-2xl border border-white/5 font-mono text-xs text-white/60 leading-relaxed overflow-auto">
              <div className="text-luxury-mono mb-4 text-white/30">Raw Strategy Object</div>
              <pre>{JSON.stringify(strategy, null, 2)}</pre>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};