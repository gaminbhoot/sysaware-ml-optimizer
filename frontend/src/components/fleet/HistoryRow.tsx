import { memo } from 'react';
import { History } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { DataValue } from '../ui/DataValue';
import type { TelemetryData } from '../FleetChart';

interface HistoryRowProps {
  record: TelemetryData;
}

export const HistoryRow = memo(({ record }: HistoryRowProps) => (
  <Card className="px-6 md:px-8 py-5 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between group hover:bg-white/[0.04] transition-all gap-6 lg:gap-8 border-transparent">
    <div className="flex items-center gap-4 md:gap-6 flex-1 w-full min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] flex items-center justify-center shrink-0 transition-colors">
        <History size={20} className="text-silver/20 group-hover:text-silver/40 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="text-white font-semibold truncate text-base md:text-lg">{record.machine_id.split('_')[0]}</p>
          {record.hardware_profile.os && (
            <Badge variant="neutral" className="hidden sm:inline">{record.hardware_profile.os}</Badge>
          )}
        </div>
        <p className="text-[10px] md:text-xs text-muted mt-1 font-mono tracking-tight">{new Date(record.timestamp).toLocaleString()}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center justify-items-start lg:justify-end gap-6 sm:gap-12 lg:gap-16 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
      <div className="min-w-0">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1.5">Goal</p>
        <p className="text-[10px] md:text-xs text-silver/70 capitalize font-medium">{record.goal}</p>
      </div>
      <DataValue
        label="Throughput"
        value={(record.decode_tokens_per_sec || 0).toFixed(1)}
        unit="t/s"
        className="text-emerald"
      />
      <DataValue
        label="P99 Latency"
        value={record.latency_range[1].toFixed(0)}
        unit="ms"
      />
      <DataValue
        label="VRAM Usage"
        value={(record.memory_mb).toFixed(0)}
        unit="MB"
      />
    </div>
  </Card>
));
