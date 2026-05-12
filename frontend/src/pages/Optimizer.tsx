import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Target, ArrowRight, Activity, Database, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useNavigate } from 'react-router-dom';

const StepProgressBar = ({ status }: { status: string }) => {
  const stages = ['starting', 'evaluating', 'scoring', 'complete'];
  const labels = ['Preparation', 'Evaluation', 'Scoring', 'Finalized'];
  
  const currentIndex = stages.indexOf(status.split('_')[0]); 
  const effectiveIndex = status === 'complete' ? 3 : currentIndex >= 0 ? currentIndex : 1;

  return (
    <div className="w-full mb-12">
      <div className="flex justify-between mb-4">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-2">
            <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
              i <= effectiveIndex ? 'bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'
            }`} />
            <span className={`text-[10px] font-mono uppercase tracking-widest ${
              i <= effectiveIndex ? 'text-white' : 'text-white/20'
            }`}>{label}</span>
          </div>
        ))}
      </div>
      <div className="h-[1px] w-full bg-white/5 relative">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${(effectiveIndex / 3) * 100}%` }}
          className="absolute top-0 left-0 h-full bg-emerald shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-1000"
        />
      </div>
    </div>
  );
};

const MetricValue = ({ value, unit }: { value: number, unit: string }) => {
  return (
    <div className="flex flex-col items-end">
      <div className="text-[10px] text-white/30 uppercase font-mono tracking-tighter">{unit}</div>
      <motion.div 
        key={value}
        initial={{ y: 2, opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-white font-mono text-sm tabular-nums"
      >
        {value.toFixed(1)}
        <span className="text-[10px] ml-0.5 text-white/40">{unit === 'Latency' ? 'ms' : 'MB'}</span>
      </motion.div>
    </div>
  );
};

const CandidateCard = ({ candidate }: { candidate: any }) => (
  <motion.div
    initial={{ opacity: 0, x: -20, scale: 0.95 }}
    animate={{ opacity: 1, x: 0, scale: 1 }}
    transition={{ type: 'spring', stiffness: 100, damping: 15 }}
    className="glass-card p-4 flex items-center justify-between border-emerald/20 bg-emerald/5 hover:bg-emerald/10 transition-colors"
  >
    <div className="flex items-center gap-4">
      <div className="p-2 rounded-lg bg-emerald/10 text-emerald">
        <Activity size={16} />
      </div>
      <div>
        <div className="font-mono text-xs uppercase tracking-widest text-white">{candidate.candidate}</div>
        <div className="text-[10px] text-white/40 font-mono italic">{(candidate.metadata?.method || 'Quantized').toUpperCase()}</div>
      </div>
    </div>
    <div className="flex gap-8">
      <MetricValue value={candidate.result?.latency_range_ms[1]} unit="Latency" />
      <MetricValue value={candidate.result?.memory_mb} unit="Memory" />
    </div>
  </motion.div>
);

export const Optimizer = () => {
  const { 
    systemProfile, modelPath, goal, setGoal, 
    isTuning, setIsTuning,
    tuningProgress, setTuningProgress,
    tuningCandidates, setTuningCandidates,
    setWinningConfig, setStrategy
  } = useStore();
  
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      setIsTuning(false);
    };
  }, []);

  const startTuning = async () => {
    if (!systemProfile || !modelPath) return;
    
    setIsTuning(true);
    setTuningCandidates([]);
    setTuningProgress('Preparation');
    setError(null);
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/optimize/autotune/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          model_path: modelPath, 
          system_profile: systemProfile, 
          goal,
          unsafe_load: false 
        }),
        signal: controller.signal
      });

      if (!response.body) throw new Error('Streaming not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (['starting', 'evaluating', 'scoring', 'evaluating_parallel'].includes(data.status)) {
                setTuningProgress(data.message || data.status);
              } else if (data.status === 'candidate_complete') {
                setTuningCandidates((prev: any[]) => [...prev, data]);
              } else if (data.status === 'candidate_failed') {
                setError(`Candidate ${data.candidate} failed: ${data.error}`);
              } else if (data.status === 'complete') {
                setTuningProgress('Finalized');
                setWinningConfig(data.best_config);
                setStrategy(data.best_config.metadata);
                
                setTimeout(() => {
                  navigate('/results');
                  setIsTuning(false);
                }, 2000);
              }
            } catch (e) {
              console.error('Stream Parse Error', e);
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        setError(e.message);
        setIsTuning(false);
      }
    }
  };

  const isReady = !!systemProfile && !!modelPath;

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-luxury-header !text-4xl md:!text-6xl">Optimization Engine</h1>
        <p className="text-luxury-subheading mt-4 text-white/40 !text-base italic">Real-time hardware-aware autotuning</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          <AnimatePresence mode="wait">
            {!isTuning ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-8 flex flex-col gap-8"
              >
                <div>
                  <h3 className="text-luxury-subheading mb-4 !text-lg">Optimization Target</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {['latency', 'memory', 'balanced'].map((g) => (
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
                    onClick={startTuning}
                    disabled={!isReady}
                    className="w-full py-6 rounded-xl bg-white text-black font-sans font-bold text-lg hover:bg-silver transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    <Zap size={20} /> Launch Live Tuning
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  {!isReady && (
                    <p className="text-red-400 font-mono text-[10px] uppercase tracking-widest mt-4 text-center">
                      {!systemProfile ? 'System Profiler must be run first.' : 'A model must be loaded first.'}
                    </p>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="tuning"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="glass-card p-8 flex flex-col gap-8 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-emerald/5 pointer-events-none overflow-hidden">
                  <motion.div 
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    className="w-full h-full bg-gradient-to-r from-transparent via-emerald/5 to-transparent"
                  />
                </div>

                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="text-luxury-subheading !text-lg flex items-center gap-2">
                        <Activity className="text-emerald animate-pulse" size={18} /> 
                        Live Tuning Session
                      </h3>
                      <div className="font-mono text-[11px] text-white/30 mt-1 uppercase tracking-widest flex items-center gap-2">
                        Status: <span className="text-emerald tabular-nums">{tuningProgress}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Goal</div>
                      <div className="text-white font-mono text-sm uppercase">{goal}</div>
                    </div>
                  </div>

                  <StepProgressBar status={tuningProgress} />

                  <div className="flex flex-col gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    <AnimatePresence>
                      {tuningCandidates.length === 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-20 flex flex-col items-center justify-center gap-4 text-white/20"
                        >
                          <div className="w-12 h-12 border-2 border-white/5 border-t-white/20 rounded-full animate-spin" />
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Acquiring Hardware Hooks...</span>
                        </motion.div>
                      )}
                      {tuningCandidates.map((c) => (
                        <CandidateCard key={c.candidate} candidate={c} />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400 font-mono text-xs"
            >
              <ShieldAlert size={16} />
              {error}
            </motion.div>
          )}
        </div>

        <div className="col-span-1 md:col-span-4">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-subheading mb-6 flex items-center gap-2 !text-lg">
              <Database size={14} className="text-white/40" /> Active Profile
            </h3>
            <div className="flex flex-col gap-6">
              <div className="space-y-1">
                <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Accelerator</div>
                <div className="text-white font-mono text-xs">{(systemProfile?.gpu_backend || 'CPU').toUpperCase()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-white/30 uppercase font-mono tracking-widest">Model</div>
                <div className="text-white font-mono text-xs truncate max-w-full">{modelPath ? modelPath.split('/').pop() : 'None'}</div>
              </div>
              <div className="pt-6 border-t border-white/10">
                <div className="flex items-center gap-2 text-emerald/60">
                  <CheckCircle2 size={12} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Secure Handshake Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};