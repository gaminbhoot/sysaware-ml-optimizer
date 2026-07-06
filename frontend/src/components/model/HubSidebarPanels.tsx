import { Activity, CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HubSidebarPanelsProps {
  modelAnalysis: any;
  modelPath: string;
  systemProfile: any;
  goal: string;
  unsafeLoad: boolean;
  setUnsafeLoad: (b: boolean) => void;
}

export const HubSidebarPanels = ({
  modelAnalysis,
  modelPath,
  systemProfile,
  goal,
  unsafeLoad,
  setUnsafeLoad
}: HubSidebarPanelsProps) => {
  return (
    <>
      {/* Status Panel */}
      <div className="glass-card p-8 border-white/5">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-white/5 rounded-lg">
            <Activity size={18} className="text-white/40" />
          </div>
          <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Hub Status</h3>
        </div>

        <div className="space-y-6">
          <div className="p-5 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[9px] font-mono uppercase text-white/30 tracking-widest mb-1">Active Backend</span>
              <span className="text-xs font-mono text-emerald uppercase tracking-tighter col-span-2 break-all max-w-[200px]">
                {modelAnalysis?.external_source || (modelPath ? 'Local Filesystem' : 'None')}
              </span>
            </div>
            {modelAnalysis ? <CheckCircle2 className="text-emerald shrink-0" size={16} /> : <AlertCircle className="text-white/10 shrink-0" size={16} />}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <div className="flex justify-between items-center text-[10px] font-mono tracking-tight">
              <span className="text-white/20">System ID</span>
              <span className="text-white/60 truncate max-w-[150px]">{systemProfile?.machine_id || 'UNREGISTERED'}</span>
            </div>
            <div className="flex justify-between items-center text-[10px] font-mono tracking-tight">
              <span className="text-white/20">Optimization Goal</span>
              <span className="text-white/60 uppercase">{goal}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Security Protocol */}
      <div className={cn(
        "glass-card p-8 border-white/5 transition-all duration-500", 
        unsafeLoad && 'border-red-500/30 shadow-[0_0_50px_rgba(239,68,68,0.1)]'
      )}>
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-2 rounded-lg transition-colors ${unsafeLoad ? 'bg-red-500/10' : 'bg-white/5'}`}>
            <ShieldAlert size={18} className={unsafeLoad ? 'text-red-500' : 'text-white/40'} />
          </div>
          <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Security Protocol</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-white/60">Unsafe Ingest</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={unsafeLoad} 
                onChange={(e) => setUnsafeLoad(e.target.checked)} 
                className="sr-only peer" 
              />
              <div className="w-10 h-5 bg-white/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500 shadow-sm" />
            </label>
          </div>
        </div>
      </div>
    </>
  );
};
