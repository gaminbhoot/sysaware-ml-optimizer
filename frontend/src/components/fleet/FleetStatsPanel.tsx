import { memo } from 'react';
import { Server, Zap, History } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/utils';
import type { NodeData } from '../../hooks/useFleetStream';
import type { TelemetryData } from '../FleetChart';

interface FleetStatsPanelProps {
  activeNodes: NodeData[];
  scopedHistory: TelemetryData[];
  isConnected: boolean;
}

export const FleetStatsPanel = memo(({
  activeNodes,
  scopedHistory,
  isConnected
}: FleetStatsPanelProps) => {
  const peakPerformance = scopedHistory.length > 0
    ? Math.max(...scopedHistory.map(h => h.decode_tokens_per_sec || 0), 0)
    : 0;

  const prefillRecords = scopedHistory.filter(h => h.prefill_latency_ms !== undefined && h.prefill_latency_ms > 0);
  const avgPrefill = prefillRecords.length > 0
    ? prefillRecords.reduce((acc, h) => acc + (h.prefill_latency_ms || 0), 0) / prefillRecords.length
    : 0;

  const decodeRecords = scopedHistory.filter(h => h.decode_tokens_per_sec !== undefined && h.decode_tokens_per_sec > 0);
  const avgDecode = decodeRecords.length > 0
    ? decodeRecords.reduce((acc, h) => acc + (h.decode_tokens_per_sec || 0), 0) / decodeRecords.length
    : 0;

  const renderStatus = (onlineText: string, offlineText: string) => (
    <>
      <div className={cn("w-2 h-2 rounded-full", isConnected ? "bg-emerald animate-pulse" : "bg-rose-500")} />
      <span className={cn("text-xs font-medium", isConnected ? "text-emerald" : "text-rose-500")}>
        {isConnected ? onlineText : offlineText}
      </span>
    </>
  );

  return (
    <>
      {/* Analytics Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
        <StatsCard
          label="Active Nodes"
          value={`${activeNodes.filter(n => n.status === 'active' || n.status === 'benchmarking').length} / ${activeNodes.length} Online`}
          icon={Server}
          color={activeNodes.length > 0 ? "text-emerald" : "text-muted"}
        />
        <StatsCard
          label="Peak Performance"
          value={`${peakPerformance.toFixed(1)} T/S`}
          icon={Zap}
        />
        <StatsCard
          label="Total Benchmarks"
          value={`${scopedHistory.length} logs`}
          icon={History}
        />
      </div>

      {/* Speed Stats Panel */}
      <Card className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 md:p-8 border-transparent mb-12 relative overflow-hidden bg-white/[0.02]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-[80px] pointer-events-none" />

        <div className="flex flex-col justify-between pr-0 md:pr-8 md:border-r border-white/5">
          <div>
            <p className="text-luxury-mono mb-1 text-[9px] md:text-[11px] opacity-40 uppercase tracking-widest">Average Prefill Latency</p>
            <h2 className="text-3xl md:text-5xl font-nistha mt-2 text-white font-light">
              {avgPrefill > 0 ? `${avgPrefill.toFixed(0)}` : '—'} <span className="text-lg md:text-2xl text-muted font-sans font-light">ms</span>
            </h2>
            <p className="text-xs text-muted mt-2 font-light leading-relaxed">Time to process prompt tokens before output starts. Lower is better.</p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            {renderStatus("Real-time telemetry", "Telemetry offline")}
          </div>
        </div>

        <div className="flex flex-col justify-between pl-0 md:pl-8">
          <div>
            <p className="text-luxury-mono mb-1 text-[9px] md:text-[11px] opacity-40 uppercase tracking-widest">Average Token Generation</p>
            <h2 className="text-3xl md:text-5xl font-nistha mt-2 text-white font-light">
              {avgDecode > 0 ? `${avgDecode.toFixed(1)}` : '—'} <span className="text-lg md:text-2xl text-muted font-sans font-light">tok/s</span>
            </h2>
            <p className="text-xs text-muted mt-2 font-light leading-relaxed">Average decode throughput speed during text generation. Higher is better.</p>
          </div>
          <div className="mt-6 flex items-center gap-2">
            {renderStatus("Active streaming", "Disconnected")}
          </div>
        </div>
      </Card>
    </>
  );
});

interface StatsCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color?: string;
}

const StatsCard = memo(({ label, value, icon: Icon, color = "text-white" }: StatsCardProps) => (
  <Card className="flex items-center justify-between group p-5 md:p-6 border-transparent">
    <div>
      <p className="text-luxury-mono mb-1 text-[9px] md:text-[11px] opacity-50 group-hover:opacity-100 transition-opacity">{label}</p>
      <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight", color)}>{value}</h3>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] flex items-center justify-center group-hover:bg-white/[0.06] transition-all">
      <Icon size={18} className="text-silver/40 group-hover:text-silver/80 transition-colors" />
    </div>
  </Card>
));
