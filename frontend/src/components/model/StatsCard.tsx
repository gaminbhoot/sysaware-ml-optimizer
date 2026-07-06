import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  delay?: number;
}

export const StatsCard = ({ label, value, icon: Icon, color = "text-white", delay = 0 }: StatsCardProps) => (
  <motion.div 
    initial={{ opacity: 0, y: 12, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    className="glass-card flex items-center justify-between group p-5 md:p-6 border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 hover:shadow-[0_0_40px_rgba(255,255,255,0.02)] transition-all duration-500 cursor-default"
    role="status"
    aria-label={`${label}: ${value}`}
  >
    <div>
      <p className="text-luxury-mono mb-1.5 text-[9px] md:text-[11px] opacity-40 group-hover:opacity-80 transition-opacity duration-300 uppercase tracking-widest">{label}</p>
      <h3 className={cn("text-lg md:text-xl font-mono truncate max-w-[240px] transition-colors duration-300", color)} title={value}>{value}</h3>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:bg-white/[0.08] group-hover:scale-110 transition-all duration-300">
      <Icon size={18} className="text-silver/30 group-hover:text-silver/70 transition-colors duration-300" />
    </div>
  </motion.div>
);
