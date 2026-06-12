import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { cn } from '../lib/utils';
import { SystemStatsList } from '../components/SystemStatsList';

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
    <div className="pt-10 pb-24 px-6 md:pt-14 md:pb-12 md:px-12 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 md:mb-16 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1"
        >
           <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-2">
             System <span className="text-white/20 italic">Profiler</span>
           </h1>
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
          <SystemStatsList loading={loading} systemProfile={systemProfile} />
        </div>

        {/* Right Panel / Info */}
        <div className="col-span-1 lg:col-span-4 order-1 lg:order-2">
          <div className="glass-card p-6 md:p-8 lg:sticky lg:top-24 border-emerald/10">
            <div className="mb-6">
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
