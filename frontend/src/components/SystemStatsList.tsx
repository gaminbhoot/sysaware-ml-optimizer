import { motion } from 'framer-motion';
import { Activity, Cpu, Monitor, HardDrive, Zap } from 'lucide-react';

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

interface SystemStatsListProps {
  loading: boolean;
  systemProfile: any;
}

export const SystemStatsList = ({ loading, systemProfile }: SystemStatsListProps) => {
  if (loading) {
    return (
      <div className="w-full h-96 glass-card flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-white/20 border-t-emerald rounded-full animate-spin" />
      </div>
    );
  }

  if (!systemProfile) {
    return (
      <div className="w-full h-96 glass-card flex items-center justify-center text-white/30 font-mono text-sm border-dashed">
        Failed to load telemetry. Check server connection.
      </div>
    );
  }

  return (
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
  );
};
