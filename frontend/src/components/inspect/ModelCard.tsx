import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModelCardProps {
  model: any;
  idx: number;
  systemProfile: any;
}

export const ModelCard = ({ model, idx, systemProfile }: ModelCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay: idx * 0.05 }}
    className="bg-white/[0.02] border border-white/5 rounded-2xl p-5 flex flex-col gap-4 hover:bg-white/[0.04] hover:border-white/10 transition-all group"
  >
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs font-mono font-medium text-white truncate max-w-[240px] sm:max-w-md">{model.name}</span>
          {model.status === 'perfect' && (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-emerald/10 text-emerald uppercase tracking-wider font-semibold">Optimal</span>
          )}
          {model.status === 'caution' && (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-400 uppercase tracking-wider font-semibold">Caution</span>
          )}
          {model.status === 'incompatible' && (
            <span className="text-[9px] font-mono px-2.5 py-0.5 rounded-md bg-red-500/10 text-red-400 uppercase tracking-wider font-semibold">Incompatible</span>
          )}
        </div>
        <p className="text-xs text-white/35 leading-relaxed max-w-xl">{model.description}</p>
      </div>
      <a 
        href={model.link}
        target="_blank"
        rel="noopener noreferrer"
        className="px-5 py-3 rounded-xl bg-white/5 border border-white/8 text-white font-mono text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all duration-300 flex items-center gap-2.5"
      >
        <ExternalLink size={12} /> View on HF
      </a>
    </div>

    <div className="flex items-center gap-3">
      <span className="text-[9px] font-mono text-white/20 uppercase tracking-widest w-16 shrink-0">RAM</span>
      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          className={cn(
            "h-full rounded-full",
            model.status === 'perfect' ? 'bg-emerald/60' : model.status === 'caution' ? 'bg-yellow-400/60' : 'bg-red-400/40'
          )}
          initial={{ width: "0%" }}
          animate={{ width: `${Math.max(Math.min((model.ramNeeded / (parseFloat(systemProfile?.ram_gb) || 8)) * 100, 100), 5)}%` }}
          transition={{ duration: 1, delay: 0.3 + idx * 0.06 }}
        />
      </div>
      <span className="text-[9px] font-mono text-white/25 w-20 text-right shrink-0">{model.ramNeeded} GB needed</span>
    </div>
  </motion.div>
);
