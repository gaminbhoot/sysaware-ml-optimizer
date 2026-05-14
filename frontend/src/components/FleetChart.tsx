import { motion } from 'framer-motion';
import { Zap, Cpu } from 'lucide-react';
import { cn } from '../lib/utils';

interface TelemetryData {
  machine_id: string;
  hardware_profile: {
    cpu?: string;
    ram_gb?: number;
    dgpu_name?: string;
    os?: string;
  };
  goal: string;
  latency_range: [number, number];
  memory_mb: number;
  decode_tokens_per_sec?: number;
  prefill_latency_ms?: number;
  timestamp: string;
}

interface FleetChartProps {
  data: TelemetryData[];
}

export const FleetChart = ({ data }: FleetChartProps) => {
  // Group telemetry by hardware profile and find the maximum token speed for each
  const hardwareSpeeds = data.reduce((acc, record) => {
    const hwKey = record.hardware_profile.dgpu_name || record.hardware_profile.cpu || 'Unknown';
    const speed = record.decode_tokens_per_sec || 0;
    
    if (!acc[hwKey] || speed > acc[hwKey]) {
      acc[hwKey] = speed;
    }
    return acc;
  }, {} as Record<string, number>);

  // Convert to array and sort by speed descending
  const sortedStats = Object.entries(hardwareSpeeds)
    .map(([hardware, speed]) => ({ hardware, speed }))
    .sort((a, b) => b.speed - a.speed);

  const maxFleetSpeed = Math.max(...sortedStats.map(s => s.speed), 1);

  return (
    <div className="glass-card p-10 border-white/[0.05] overflow-hidden">
      <div className="flex items-center justify-between mb-12">
        <div>
          <h3 className="text-2xl text-white font-medium mb-1">Fleet Performance Benchmark</h3>
          <p className="text-sm text-white/40">Real-world decode throughput (Tokens/Sec) across diverse hardware profiles.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald/10 border border-emerald/20 rounded-xl">
          <Zap size={16} className="text-emerald" />
          <span className="text-xs text-emerald font-bold uppercase tracking-wider">Live Metrics</span>
        </div>
      </div>

      <div className="space-y-10">
        {sortedStats.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
            <p className="text-white/20">No telemetry data available to visualize.</p>
          </div>
        ) : (
          sortedStats.map((stat, i) => {
            const ratio = stat.speed / maxFleetSpeed;
            const isWinner = i === 0 && stat.speed > 0;

            return (
              <div key={stat.hardware} className="relative">
                <div className="flex justify-between items-end mb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center border",
                        isWinner ? "bg-emerald/10 border-emerald/20" : "bg-white/5 border-white/10"
                    )}>
                      <Cpu size={14} className={isWinner ? "text-emerald" : "text-white/40"} />
                    </div>
                    <div>
                        <p className={cn("text-sm font-medium", isWinner ? "text-white" : "text-white/60")}>{stat.hardware}</p>
                        {isWinner && <p className="text-[10px] text-emerald font-bold tracking-widest uppercase mt-0.5">Fleet Leader</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn("text-2xl font-mono font-bold", isWinner ? "text-emerald" : "text-white")}>
                      {stat.speed.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-white/20 ml-2 uppercase font-mono tracking-widest">Tokens/Sec</span>
                  </div>
                </div>

                {/* Track */}
                <div className="h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 relative">
                  {/* Progress Bar */}
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${ratio * 100}%` }}
                    transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                      "h-full rounded-full relative",
                      isWinner 
                        ? "bg-gradient-to-r from-emerald/40 to-emerald shadow-[0_0_20px_rgba(16,185,129,0.3)]" 
                        : "bg-white/20"
                    )}
                  >
                    {/* Glow effect for winner */}
                    {isWinner && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="absolute inset-0 bg-white/20"
                        />
                    )}
                  </motion.div>
                </div>

                {/* Grid line markings */}
                <div className="absolute inset-x-0 -bottom-6 flex justify-between pointer-events-none">
                   {[0, 0.25, 0.5, 0.75, 1].map((p) => (
                       <div key={p} className="flex flex-col items-center">
                           <div className="w-px h-1 bg-white/10 mb-1" />
                           <span className="text-[8px] text-white/10 font-mono">{(p * maxFleetSpeed).toFixed(0)}</span>
                       </div>
                   ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Comparison Insight Footer */}
      {sortedStats.length > 1 && (
          <div className="mt-20 pt-8 border-t border-white/5 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                  <Activity size={18} className="text-white/40" />
              </div>
              <div>
                  <p className="text-xs text-white/60 leading-relaxed">
                      Hardware variance analysis: <span className="text-white font-bold">{sortedStats[0].hardware}</span> is currently outperforming <span className="text-white/80">{sortedStats[sortedStats.length-1].hardware}</span> by a factor of <span className="text-emerald font-bold">{(sortedStats[0].speed / Math.max(sortedStats[sortedStats.length-1].speed, 0.1)).toFixed(1)}x</span>.
                  </p>
              </div>
          </div>
      )}
    </div>
  );
};

const Activity = ({ size, className }: { size: number, className: string }) => (
    <svg 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
);
