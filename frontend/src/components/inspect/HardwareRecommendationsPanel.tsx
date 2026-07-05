import { motion } from 'framer-motion';
import { RefreshCcw, Cpu } from 'lucide-react';
import { ModelCard } from './ModelCard';

interface HardwareRecommendationsPanelProps {
  systemProfile: any;
  loadingRecommendations: boolean;
  recommendations: any[];
}

export const HardwareRecommendationsPanel = ({
  systemProfile,
  loadingRecommendations,
  recommendations
}: HardwareRecommendationsPanelProps) => {
  const getHFRecommendations = () => {
    const ram = systemProfile?.ram_gb || 8;
    const isMac = systemProfile?.os?.toLowerCase().includes('mac') || systemProfile?.os?.toLowerCase().includes('darwin');
    const isMetal = systemProfile?.gpu_backend?.toLowerCase() === 'metal' || isMac;

    const allModels = recommendations;

    const processed = allModels.map(m => {
      const isMlx = m.format.includes("MLX");
      const formatMatch = isMetal ? isMlx : !isMlx;
      
      let status: 'perfect' | 'caution' | 'incompatible' = 'perfect';
      const ramRatio = m.ramNeeded / ram;
      if (ramRatio > 1.0) {
        status = 'incompatible';
      } else if (ramRatio >= 0.65) {
        status = 'caution';
      } else {
        status = 'perfect';
      }

      return {
        ...m,
        status,
        formatMatch
      };
    });

    return {
      optimal: processed.filter(m => m.status === 'perfect').sort((a, b) => {
        if (a.formatMatch !== b.formatMatch) return b.formatMatch ? 1 : -1;
        return b.ramNeeded - a.ramNeeded;
      }),
      tight: processed.filter(m => m.status === 'caution').sort((_, b) => b.formatMatch ? 1 : -1),
      heavy: processed.filter(m => m.status === 'incompatible').sort((_, b) => b.formatMatch ? 1 : -1)
    };
  };

  const recs = getHFRecommendations();

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="px-8 md:px-10 pb-10 flex flex-col gap-8 border-t border-white/5 pt-8">
        {!systemProfile || loadingRecommendations ? (
          <div className="py-12 flex flex-col items-center justify-center gap-4">
            <RefreshCcw size={24} className="text-white/10 animate-spin" />
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/20">
              {!systemProfile ? "Analyzing hardware constraints..." : "Fetching live recommendations..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <p className="text-xs text-white/30 leading-relaxed max-w-lg">
                Hugging Face models scored against your device — 
                <span className="text-white/50 font-mono"> {systemProfile.ram_available_gb?.toFixed(1) || systemProfile.ram_gb} GB Avail</span>, 
                <span className="text-white/50 font-mono"> {systemProfile.dgpu_name !== 'None' ? systemProfile.dgpu_name : systemProfile.gpu_name !== 'None' ? systemProfile.gpu_name : 'No dGPU found'}</span>.
              </p>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-silver/5 border border-silver/10 text-silver text-[10px] font-mono uppercase tracking-wider backdrop-blur-sm">
                <Cpu size={12} /> {systemProfile.gpu_backend?.toUpperCase() || "CPU"} Backend
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald" />
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Optimal</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Tight Fit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">Incompatible</span>
              </div>
            </div>

            <div className="flex flex-col gap-10 max-h-[500px] overflow-y-auto pr-3">
              {/* Optimal Section */}
              {recs.optimal.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-emerald/20" />
                    <span className="text-[10px] font-mono text-emerald/60 uppercase tracking-[0.3em]">Optimal Models</span>
                    <div className="h-[1px] flex-1 bg-emerald/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.optimal.map((model, idx) => (
                      <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                    ))}
                  </div>
                </div>
              )}

              {/* Tight Fit Section */}
              {recs.tight.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-yellow-500/20" />
                    <span className="text-[10px] font-mono text-yellow-500/60 uppercase tracking-[0.3em]">Tight Fit Models</span>
                    <div className="h-[1px] flex-1 bg-yellow-500/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.tight.map((model, idx) => (
                      <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                    ))}
                  </div>
                </div>
              )}

              {/* Incompatible Section */}
              {recs.heavy.length > 0 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-[1px] flex-1 bg-red-500/20" />
                    <span className="text-[10px] font-mono text-red-500/60 uppercase tracking-[0.3em]">Incompatible Models</span>
                    <div className="h-[1px] flex-1 bg-red-500/20" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {recs.heavy.map((model, idx) => (
                      <ModelCard key={model.repo_id} model={model} idx={idx} systemProfile={systemProfile} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
