import { motion } from 'framer-motion';
import { Zap, RefreshCcw, Activity, Clock, Layers, CheckCircle2 } from 'lucide-react';

interface TuneTabProps {
  modelAnalysis: any;
  isRuntimeTuning: boolean;
  runtimeTuningProgress: any[];
  optimalRuntimeConfig: any;
  runRuntimeTuner: () => Promise<void>;
}

export const TuneTab = ({
  modelAnalysis,
  isRuntimeTuning,
  runtimeTuningProgress,
  optimalRuntimeConfig,
  runRuntimeTuner
}: TuneTabProps) => {
  return (
    <div className="glass-card p-10 relative overflow-hidden">
      {!modelAnalysis ? (
        <div className="py-20 flex flex-col items-center text-center">
          <Zap size={48} className="text-white/10 mb-6" />
          <h3 className="text-xl font-light mb-2">Ready to Tune?</h3>
          <p className="text-sm text-white/30 max-w-sm">Load a pre-built model to optimize its runtime split and context bounds.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-2xl font-light mb-2">Parameter Tuner</h3>
              <p className="text-sm text-white/30">Auto-benchmarking for VRAM split, max context, and concurrency ceilings.</p>
            </div>
            <button
              onClick={runRuntimeTuner}
              disabled={isRuntimeTuning}
              className="flex items-center gap-3 px-8 py-4 bg-emerald text-black rounded-xl font-mono text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              {isRuntimeTuning ? <RefreshCcw size={16} className="animate-spin" /> : <Activity size={16} />}
              {isRuntimeTuning ? "Tuning..." : "Start Tuning"}
            </button>
          </div>

          {/* Tuning Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Context Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3 text-white/40">
                <Clock size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Max Context</span>
              </div>
              <div className="text-3xl font-mono">
                {optimalRuntimeConfig?.num_ctx || '—'}
              </div>
              {isRuntimeTuning && runtimeTuningProgress.some(p => p.step === 'context_length') && (
                <motion.div className="absolute bottom-0 left-0 h-1 bg-emerald/40" initial={{ width: 0 }} animate={{ width: '100%' }} />
              )}
            </div>

            {/* Split Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3 text-white/40">
                <Layers size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest">VRAM Split</span>
              </div>
              <div className="text-3xl font-mono">
                {optimalRuntimeConfig?.num_gpu === -1 ? '100% GPU' : optimalRuntimeConfig?.num_gpu || '—'}
              </div>
            </div>

            {/* Concurrency Card */}
            <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 flex flex-col gap-4 relative overflow-hidden">
              <div className="flex items-center gap-3 text-white/40">
                <CheckCircle2 size={16} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Concurrency</span>
              </div>
              <div className="text-3xl font-mono">
                {optimalRuntimeConfig?.concurrency_limit ? `${optimalRuntimeConfig.concurrency_limit}x` : '—'}
              </div>
            </div>
          </div>

          {/* Detailed Log */}
          <div className="bg-black/40 border border-white/5 rounded-2xl p-6 font-mono text-[10px] h-[200px] overflow-y-auto">
            <div className="text-white/20 mb-4 uppercase tracking-widest">Process Log</div>
            {runtimeTuningProgress.map((p, i) => (
              <div key={i} className="flex gap-4 mb-2 text-white/60 animate-in fade-in slide-in-from-left-2">
                <span className="text-emerald/50">[{p.status}]</span>
                <span>{p.message}</span>
              </div>
            ))}
            {isRuntimeTuning && <div className="text-emerald animate-pulse">Running active benchmarking...</div>}
          </div>
        </div>
      )}
    </div>
  );
};
