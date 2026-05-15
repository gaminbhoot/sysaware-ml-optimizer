import React from 'react';
import { cn } from '../../lib/utils';

interface DataValueProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string | number;
  label?: string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
}

/**
 * Metric display component for ML telemetry data.
 * Optimized for frequent real-time updates via SSE.
 */
export const DataValue = React.memo(({ value, label, unit, trend, className, ...props }: DataValueProps) => {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {label && (
        <span className="text-luxury-mono">
          {label}
        </span>
      )}
      <div className="flex items-baseline gap-1.5">
        <span className="text-3xl md:text-4xl font-sans font-light tracking-tight text-white">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-serif italic text-muted">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
});

DataValue.displayName = 'DataValue';
