import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Cpu, Zap, History, LayoutGrid, List } from 'lucide-react';
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

export const FleetView = () => {
  const [fleet, setFleet] = useState<TelemetryData[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Fetch initial history
    fetch('/api/telemetry/history')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') {
          setFleet(data.history);
        }
      });

    // Subscribe to live stream
    const eventSource = new EventSource('/api/telemetry/stream');
    
    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'telemetry') {
        const newData = message.data;
        setFleet(prev => {
          // Replace if exists, or append
          const index = prev.findIndex(item => item.machine_id === newData.machine_id);
          if (index !== -1) {
            const updated = [...prev];
            updated[index] = { ...newData, timestamp: new Date().toISOString() };
            return updated;
          }
          return [{ ...newData, timestamp: new Date().toISOString() }, ...prev];
        });
      }
    };

    return () => eventSource.close();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] p-12 ml-24">
      {/* Header Section */}
      <div className="flex justify-between items-end mb-16">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald shadow-[0_0_8px_#10B981]" : "bg-red-500 shadow-[0_0_8px_#EF4444]"
            )} />
            <span className="text-luxury-mono">Fleet Telemetry Engine</span>
          </div>
          <h1 className="text-5xl mb-2 text-white">Distributed Nodes</h1>
          <p className="text-luxury-subheading text-white/50">Real-time hardware optimization across the network.</p>
        </div>

        <div className="flex gap-4 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn(
              "p-2 rounded-lg transition-all",
              viewMode === 'list' ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60"
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <StatsCard label="Active Nodes" value={fleet.length.toString()} icon={Server} />
        <StatsCard label="Avg. Latency" value={`${(fleet.reduce((acc, curr) => acc + curr.latency_range[1], 0) / (fleet.length || 1)).toFixed(2)}ms`} icon={Zap} />
        <StatsCard label="Total Memory" value={`${(fleet.reduce((acc, curr) => acc + curr.memory_mb, 0) / 1024).toFixed(2)}GB`} icon={History} />
        <StatsCard label="Fleet Health" value={isConnected ? "100%" : "0%"} icon={Cpu} />
      </div>

      {/* Fleet Display */}
      <AnimatePresence mode="popLayout">
        <motion.div 
          layout
          className={cn(
            "grid gap-6",
            viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
          )}
        >
          {fleet.map((node) => (
            <NodeCard key={node.machine_id} node={node} viewMode={viewMode} />
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const StatsCard = ({ label, value, icon: Icon }: { label: string, value: string, icon: any }) => (
  <div className="glass-card p-6 flex items-center justify-between border-white/[0.05]">
    <div>
      <p className="text-luxury-mono mb-1">{label}</p>
      <h3 className="text-2xl text-white font-bold">{value}</h3>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
      <Icon size={20} className="text-white/40" />
    </div>
  </div>
);

const NodeCard = ({ node, viewMode }: { node: TelemetryData, viewMode: 'grid' | 'list' }) => {
  const isMac = node.hardware_profile.os?.toLowerCase().includes('darwin');
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn(
        "glass-card p-8 group hover:bg-white/[0.04] transition-all relative overflow-hidden",
        viewMode === 'list' && "flex items-center justify-between py-6"
      )}
    >
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald/5 blur-[64px] rounded-full -mr-16 -mt-16 group-hover:bg-emerald/10 transition-all" />
      
      <div className={cn(viewMode === 'list' && "flex items-center gap-8")}>
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className={cn(
              "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
              isMac ? "bg-white/10 text-white" : "bg-blue-500/10 text-blue-400"
            )}>
              {node.hardware_profile.os || 'Unknown OS'}
            </span>
            <span className="text-luxury-mono text-[9px]">Last seen {new Date(node.timestamp).toLocaleTimeString()}</span>
          </div>
          <h4 className="text-xl text-white mb-1 group-hover:text-emerald transition-colors">
            {node.machine_id.split('_')[0]}
          </h4>
          <p className="text-sm text-white/40">{node.hardware_profile.cpu || 'Generic CPU'}</p>
        </div>

        {viewMode === 'grid' && (
          <div className="space-y-6 pt-6 border-t border-white/5">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-luxury-mono text-[9px] mb-2">Latency</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl text-white font-mono">{node.latency_range[1].toFixed(1)}</span>
                  <span className="text-xs text-white/30 font-mono">ms</span>
                </div>
              </div>
              <div>
                <p className="text-luxury-mono text-[9px] mb-2">Memory</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl text-white font-mono">{(node.memory_mb).toFixed(0)}</span>
                  <span className="text-xs text-white/30 font-mono">MB</span>
                </div>
              </div>
            </div>

            {(node.decode_tokens_per_sec || node.prefill_latency_ms) && (
              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5 border-dashed">
                {node.decode_tokens_per_sec && (
                  <div>
                    <p className="text-luxury-mono text-[9px] mb-2 text-emerald/60">Speed</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl text-emerald font-mono">{node.decode_tokens_per_sec.toFixed(1)}</span>
                      <span className="text-[10px] text-emerald/40 font-mono italic">t/s</span>
                    </div>
                  </div>
                )}
                {node.prefill_latency_ms && (
                  <div>
                    <p className="text-luxury-mono text-[9px] mb-2 text-blue-400/60">TTFT</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl text-blue-400 font-mono">{node.prefill_latency_ms.toFixed(0)}</span>
                      <span className="text-[10px] text-blue-400/40 font-mono">ms</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {viewMode === 'list' && (
        <div className="flex items-center gap-12">
          {node.decode_tokens_per_sec && (
            <div className="text-right">
              <p className="text-luxury-mono text-[9px] mb-1 text-emerald/60">Speed</p>
              <p className="text-xl text-emerald font-mono">{node.decode_tokens_per_sec.toFixed(1)} t/s</p>
            </div>
          )}
          <div className="text-right">
            <p className="text-luxury-mono text-[9px] mb-1">Latency</p>
            <p className="text-xl text-white font-mono">{node.latency_range[1].toFixed(1)}ms</p>
          </div>
          <div className="text-right">
            <p className="text-luxury-mono text-[9px] mb-1">Memory</p>
            <p className="text-xl text-white font-mono">{(node.memory_mb).toFixed(0)}MB</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center ml-4">
            <Zap size={16} className={cn(node.decode_tokens_per_sec ? "text-emerald shadow-[0_0_10px_#10B98155]" : "text-white/40")} />
          </div>
        </div>
      )}
    </motion.div>
  );
};
