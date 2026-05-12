import { motion } from 'framer-motion';
import { useStore } from '../context/StoreContext';
import { Target, AlertCircle, Zap, Cpu, Activity, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CandidateResultCard = ({ candidate, isWinner }: { candidate: any, isWinner: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className={`glass-card p-6 border ${isWinner ? 'border-emerald/40 bg-emerald/5' : 'border-white/5 bg-white/[0.01]'}`}
  >
    <div className="flex justify-between items-start mb-6">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isWinner ? 'bg-emerald/10 text-emerald' : 'bg-white/5 text-white/30'}`}>
          <Zap size={16} />
        </div>
        <div>
          <div className="font-mono text-xs uppercase tracking-widest text-white">{candidate.candidate}</div>
          <div className="text-[10px] text-white/40 font-mono italic">{(candidate.metadata?.method || 'Quantized').toUpperCase()}</div>
        </div>
      </div>
      {isWinner && (
        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald/10 border border-emerald/20 rounded-full">
          <Award size={12} className="text-emerald" />
          <span className="text-[9px] font-mono text-emerald uppercase tracking-widest font-bold">Optimal</span>
        </div>
      )}
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      <div>
        <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest mb-1">Latency</div>
        <div className="text-white font-mono text-xl">{candidate.result?.latency_range_ms[1].toFixed(1)}<span className="text-xs ml-1 text-white/30">ms</span></div>
      </div>
      <div>
        <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest mb-1">Memory</div>
        <div className="text-white font-mono text-xl">{candidate.result?.memory_mb.toFixed(1)}<span className="text-xs ml-1 text-white/30">MB</span></div>
      </div>
    </div>
  </motion.div>
);

export const Results = () => {
  const { winningConfig, tuningCandidates, strategy } = useStore();
  const navigate = useNavigate();

  if (!winningConfig && !strategy) {
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

  // Fallback for direct strategy access (legacy/baseline)
  const displayStrategy = winningConfig || strategy;

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-luxury-header !text-4xl md:!text-6xl">Optimization Report</h1>
        <p className="text-luxury-subheading mt-4 text-emerald !text-base">System-aware strategy compiled successfully</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Main Winner Card */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-8 md:p-12 border-emerald/20 shadow-[0_0_60px_rgba(16,185,129,0.08)] relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
              <Award size={300} />
            </div>

            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/5 relative z-10">
              <div className="w-14 h-14 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald">
                <Target size={24} />
              </div>
              <div>
                <div className="text-luxury-mono text-white/40">Top Performer</div>
                <div className="font-sans font-black text-3xl text-white uppercase tracking-tight">
                  {displayStrategy.name || displayStrategy.device || 'Optimized Config'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
              <div>
                <h3 className="text-luxury-subheading mb-6 !text-lg">Recommendation</h3>
                <div className="bg-white/[0.02] border border-white/5 p-6 rounded-2xl">
                  <p className="font-mono text-sm text-white/80 leading-relaxed mb-4">
                    Based on your goal and hardware profile, we recommend applying the 
                    <strong className="text-emerald mx-1">{(displayStrategy.mode || displayStrategy.optimization || 'None').toUpperCase()}</strong> 
                    quantization pathway.
                  </p>
                  <div className="flex items-start gap-3 p-4 bg-emerald/5 rounded-xl border border-emerald/10">
                    <Activity size={16} className="text-emerald shrink-0 mt-0.5" />
                    <span className="font-mono text-[11px] text-emerald/80 leading-relaxed italic">
                      {displayStrategy.metadata?.rationale || displayStrategy.rationale || 'Optimal balance achieved for current system constraints.'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-luxury-subheading mb-6 !text-lg">Actionable Next Steps</h3>
                <ul className="space-y-4">
                  {[
                    `Deploy using ${displayStrategy.name || 'selected'} configuration`,
                    "Monitor thermal throttling during long-tail inference",
                    "Validate precision parity on your specific test set"
                  ].map((step, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full border border-emerald/30 flex items-center justify-center text-[10px] text-emerald font-mono">
                        {i + 1}
                      </div>
                      <span className="font-mono text-xs text-white/60">{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>

          {/* Comparison Grid */}
          {tuningCandidates && tuningCandidates.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-luxury-subheading !text-lg">Hardware Candidate Comparison</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {tuningCandidates.map((c: any) => (
                  <CandidateResultCard 
                    key={c.candidate} 
                    candidate={c} 
                    isWinner={c.candidate === displayStrategy.name} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-8">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-subheading mb-6 flex items-center gap-2 !text-lg">
              <Cpu size={14} className="text-white/40" /> Profiler Context
            </h3>
            <div className="flex flex-col gap-6">
              <div className="space-y-1">
                <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Inference Goal</div>
                <div className="text-white font-mono text-xs uppercase text-emerald">Latency Optimization</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Candidates Scored</div>
                <div className="text-white font-mono text-xs">{tuningCandidates.length} Modes Evaluated</div>
              </div>
              
              <div className="pt-6 border-t border-white/10">
                <button
                  onClick={() => navigate('/optimizer')}
                  className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-white font-mono text-xs tracking-widest uppercase transition-all"
                >
                  Restart Tuning
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};