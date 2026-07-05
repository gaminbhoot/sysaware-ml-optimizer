import { Database, RefreshCcw, CheckCircle2, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';

interface DownloadedModelCardProps {
  model: any;
  modelAnalysis: any;
  loadingModelId: string | null;
  loading: boolean;
  onModelClick: (model: any) => void;
}

export const DownloadedModelCard = ({
  model,
  modelAnalysis,
  loadingModelId,
  loading,
  onModelClick
}: DownloadedModelCardProps) => {
  const modelIdentifier = model.model_id || model.model_name;
  const isActive = !!modelAnalysis && (
    (!!modelAnalysis.base_id && modelAnalysis.base_id === model.base_id) ||
    (!!modelAnalysis.model_id && modelAnalysis.model_id === model.model_id) ||
    (!!modelAnalysis.model_name && modelAnalysis.model_name === model.model_name)
  );
  const isLoaded = model.loaded;
  const isThisModelLoading = loadingModelId === modelIdentifier;
  const isDisabled = (loadingModelId !== null && !isThisModelLoading) || loading;

  let cardStyle = "";
  let Badge = null;
  let RightIcon = null;

  if (isActive) {
    cardStyle = "bg-emerald/10 border-emerald/40 text-emerald shadow-[0_0_15px_rgba(16,185,129,0.15)]";
    Badge = <span className="px-1.5 py-0.5 rounded bg-emerald/20 text-emerald text-[8px] font-mono tracking-wider uppercase font-bold">Active</span>;
    RightIcon = <CheckCircle2 size={12} className="flex-shrink-0" />;
  } else if (isThisModelLoading) {
    cardStyle = "bg-white/[0.02] border-white/20 text-white/80 animate-pulse cursor-wait";
    Badge = <span className="px-1.5 py-0.5 rounded bg-white/10 text-white/60 text-[8px] font-mono tracking-wider uppercase">Loading...</span>;
    RightIcon = <RefreshCcw size={12} className="animate-spin text-white/40 flex-shrink-0" />;
  } else if (isLoaded) {
    cardStyle = "bg-blue-500/10 border-blue-500/30 text-blue-400 hover:border-blue-500/50 hover:bg-blue-500/15";
    Badge = <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-mono tracking-wider uppercase">Loaded</span>;
    RightIcon = (
      <div className="flex items-center gap-1.5">
        <Database size={12} className="text-blue-500 flex-shrink-0 group-hover:scale-110 transition-transform" />
        <span className="text-[8px] font-mono tracking-wider uppercase opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500/20 px-1 py-0.5 rounded text-blue-300">Activate</span>
      </div>
    );
  } else {
    cardStyle = "bg-white/[0.02] border-white/5 text-white/60 hover:border-white/20 hover:bg-white/[0.05] hover:text-white/80";
    RightIcon = <Zap size={12} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-white/40" />;
  }

  return (
    <button
      onClick={() => !isActive && !isDisabled && onModelClick(model)}
      disabled={isDisabled}
      className={cn(
        "p-3 rounded-lg border text-left transition-all group flex items-center justify-between",
        cardStyle,
        isDisabled && "opacity-40 cursor-not-allowed pointer-events-none"
      )}
    >
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="text-[10px] font-medium truncate">{model.model_name}</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[8px] font-mono opacity-40 uppercase">
            {model.num_params ? `${(model.num_params / 1e9).toFixed(1)}B Params` : '0.0B Params'}
          </span>
          {Badge}
        </div>
      </div>
      {RightIcon}
    </button>
  );
};
