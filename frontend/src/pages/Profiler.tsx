import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Monitor, HardDrive, Zap, RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';

const StatCard = ({ label, value, icon: Icon, delay = 0 }: { label: string, value: string | number, icon: any, delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card p-5 md:p-6 flex flex-col justify-between min-h-[140px] md:h-40 group hover:bg-white/[0.04] transition-all"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-white/5 text-white/50 group-hover:text-white transition-colors shrink-0">
        <Icon size={18} />
      </div>
      <span className="text-luxury-mono text-[10px] md:text-[11px]">{label}</span>
    </div>
    <div className="font-sans font-bold text-xl md:text-3xl text-white tracking-tight break-words">
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
    <div className="p-6 md:p-12 lg:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1"
        >
           <h1 className="text-luxury-header">System Profiler</h1>
           <p className="text-luxury-subheading mt-2 md:mt-4 text-white/40 !text-sm md:!text-base">Hardware telemetry & resource mapping</p>
        </motion.div>

        <button
          onClick={runProfiler}
          disabled={loading}
          className={cn(
            "p-3 md:p-4 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-all flex items-center gap-2 shrink-0",
            loading && "text-emerald"
          )}
          title="Refresh Profile"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
          <span className="text-xs font-medium md:hidden">Refresh Telemetry</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
        {/* Main Canvas */}
        <div className="col-span-1 lg:col-span-8 flex flex-col gap-8 order-2 lg:order-1">
          {loading ? (
            <div className="w-full h-96 glass-card flex items-center justify-center">
              <div className="w-12 h-12 border-2 border-white/20 border-t-emerald rounded-full animate-spin" />
            </div>
          ) : systemProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
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
            <div className="w-full h-96 glass-card flex items-center justify-center text-white/30 font-mono text-sm border-dashed">
              Failed to load telemetry. Check server connection.
            </div>
          )}
        </div>

        {/* Right Panel / Info */}
        <div className="col-span-1 lg:col-span-4 order-1 lg:order-2">
          <div className="glass-card p-6 md:p-8 lg:sticky lg:top-24 border-emerald/10">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-2 h-2 rounded-full bg-emerald shadow-[0_0_8px_#10B981]" />
               <h3 className="text-luxury-subheading !text-lg !font-bold tracking-tight">Capabilities</h3>
            </div>
            
            <div className="space-y-4 mb-8">
              <CapabilityItem label="ML Acceleration" active={systemProfile?.gpu_available} />
              <CapabilityItem label="High Bandwidth Memory" active={systemProfile?.ram_gb > 16} />
              <CapabilityItem label="Dedicated Graphics" active={systemProfile?.dgpu_name !== 'None'} />
              <CapabilityItem label="Neural Engine" active={systemProfile?.npu_available} />
            </div>

            <p className="text-sm text-white/40 leading-relaxed font-medium italic">
              "The system profile determines the optimal weight loading strategy and kernel selection during the optimization phase."
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const CapabilityItem = ({ label, active }: { label: string, active: boolean }) => (
  <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
    <span className={cn("text-xs font-medium transition-colors", active ? "text-white" : "text-white/20")}>{label}</span>
    <span className={cn(
      "text-[9px] font-bold px-2 py-0.5 rounded-full",
      active ? "text-emerald bg-emerald/10" : "text-white/10 bg-white/5"
    )}>
      {active ? 'ACTIVE' : 'N/A'}
    </span>
  </div>
);
