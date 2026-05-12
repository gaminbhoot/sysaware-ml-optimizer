import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Monitor, HardDrive, Zap } from 'lucide-react';
import { useStore } from '../context/StoreContext';

const StatCard = ({ label, value, icon: Icon, delay = 0 }: { label: string, value: string | number, icon: any, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card p-6 flex flex-col justify-between h-40 group"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/5 text-white/50 group-hover:text-white transition-colors">
        <Icon size={18} />
      </div>
      <span className="text-luxury-mono">{label}</span>
    </div>
    <div className="font-sans font-bold text-2xl md:text-3xl text-white tracking-tight break-words">
      {value}
    </div>
  </motion.div>
);

export const Profiler = () => {
  const { systemProfile, setSystemProfile } = useStore();
  const [loading, setLoading] = useState(false);

  const runProfiler = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/system');
      const data = await res.json();
      setSystemProfile(data.profile);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!systemProfile) {
      runProfiler();
    }
  }, []);

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-luxury-header !text-4xl md:!text-6xl">System Profiler</h1>
        <p className="text-luxury-mono mt-4 text-white/40">Hardware telemetry & resource mapping</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        {/* Main Canvas */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          {loading ? (
            <div className="w-full h-96 glass-card flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/20 border-t-emerald rounded-full animate-spin" />
            </div>
          ) : systemProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <StatCard label="Platform" value={systemProfile.os || 'Unknown'} icon={Monitor} delay={0.1} />
              <StatCard label="CPU Cores" value={systemProfile.cpu_cores || 0} icon={Cpu} delay={0.2} />
              <StatCard label="Total RAM" value={`${(systemProfile.ram_gb || 0).toFixed(1)} GB`} icon={HardDrive} delay={0.3} />
              <StatCard 
                label="Accelerator" 
                value={systemProfile.gpu_available ? (systemProfile.gpu_backend || 'Generic').toUpperCase() : 'CPU Only'} 
                icon={Activity} 
                delay={0.4} 
              />
              <StatCard 
                label="dGPU" 
                value={systemProfile.dgpu_name !== 'None' ? systemProfile.dgpu_name : 'None'} 
                icon={Zap} 
                delay={0.5} 
              />
              <StatCard 
                label="iGPU" 
                value={systemProfile.igpu_name !== 'None' ? systemProfile.igpu_name : 'None'} 
                icon={Monitor} 
                delay={0.6} 
              />
              <StatCard 
                label="NPU" 
                value={systemProfile.npu_available ? systemProfile.npu_name : 'None'} 
                icon={Cpu} 
                delay={0.7} 
              />
              <StatCard 
                label="Available RAM" 
                value={`${(systemProfile.ram_available_gb || 0).toFixed(1)} GB`} 
                icon={Activity} 
                delay={0.8} 
              />
            </div>
          ) : (
            <div className="w-full h-96 glass-card flex items-center justify-center text-white/30 font-mono text-sm">
              Failed to load telemetry.
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="col-span-1 md:col-span-4">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-mono mb-6">Actions</h3>
            <button
              onClick={runProfiler}
              disabled={loading}
              className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Activity size={14} /> Re-run Profiler
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};