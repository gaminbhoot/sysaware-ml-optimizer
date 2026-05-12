import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Cpu, Zap, History, LayoutGrid, List, Trash2, Activity, Filter, RefreshCcw } from 'lucide-react';
import { cn } from '../lib/utils';

interface NodeData {
  machine_id: string;
  hardware_profile: {
    cpu?: string;
    ram_gb?: number;
    dgpu_name?: string;
    os?: string;
  };
  status: string;
  last_seen: string;
}

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
  const [activeNodes, setActiveNodes] = useState<NodeData[]>([]);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [pendingNode, setPendingNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [historyRes, nodesRes] = await Promise.all([
        fetch('/api/telemetry/history'),
        fetch('/api/fleet/active')
      ]);
      
      const historyData = await historyRes.json();
      const nodesData = await nodesRes.json();

      if (historyData.status === 'success') setHistory(historyData.history);
      if (nodesData.status === 'success') setActiveNodes(nodesData.nodes);
    } catch (e) {
      console.error("Failed to refresh data", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const eventSource = new EventSource('/api/telemetry/stream');
    eventSource.onopen = () => setIsConnected(true);
    eventSource.onerror = () => setIsConnected(false);

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'telemetry') {
        fetchData(); // Refresh history on new telemetry
      } else if (message.type === 'join_request') {
        setPendingNode(message.machine_id);
      }
    };

    const pollInterval = setInterval(fetchData, 15000); // Poll active nodes every 15s

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };
  }, []);

  const handleDeleteNode = async (id: string) => {
    if (!confirm(`Are you sure you want to remove node ${id} and all its benchmark history?`)) return;
    
    try {
      const res = await fetch(`/api/fleet/node/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      }
    } catch (e) {
      console.error("Delete failed", e);
    }
  };

  const handleJoinResponse = async (id: string, approve: boolean) => {
    try {
      const endpoint = approve ? '/api/fleet/join/approve' : '/api/fleet/join/reject';
      await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: id })
      });
      setPendingNode(null);
      if (approve) fetchData();
    } catch (e) {
      console.error("Join response failed", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-12 ml-24">
      {/* Join Request Modal */}
      <AnimatePresence>
        {pendingNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-card max-w-md w-full p-8 border-emerald/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald/10 border border-emerald/20 flex items-center justify-center">
                  <Activity className="text-emerald" size={24} />
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold">Join Request</h3>
                  <p className="text-white/40 text-sm">A new node wants to connect.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-8">
                <p className="text-luxury-mono text-[10px] text-white/20 mb-1">Machine ID</p>
                <p className="text-white font-mono break-all">{pendingNode}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleJoinResponse(pendingNode, false)}
                  className="px-6 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all font-medium"
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleJoinResponse(pendingNode, true)}
                  className="px-6 py-3 rounded-xl bg-emerald text-white hover:bg-emerald-600 transition-all font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Accept Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex justify-between items-end mb-16">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className={cn(
              "w-2 h-2 rounded-full",
              isConnected ? "bg-emerald shadow-[0_0_8px_#10B981]" : "bg-red-500 shadow-[0_0_8px_#EF4444]"
            )} />
            <span className="text-luxury-mono">SysAware Fleet Management</span>
          </div>
          <h1 className="text-5xl mb-2 text-white">Infrastructure</h1>
          <p className="text-luxury-subheading text-white/50">Manage active benchmarking nodes and historical performance data.</p>
        </div>

        <div className="flex items-center gap-6">
           {/* Tab Switcher */}
          <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl">
            <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={Activity} label="Live Fleet" count={activeNodes.length} />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="Telemetry History" count={history.length} />
          </div>

          <div className="h-8 w-px bg-white/10" />

          <button 
            onClick={fetchData}
            className={cn("p-2 text-white/40 hover:text-white transition-all", isRefreshing && "animate-spin text-emerald")}
          >
            <RefreshCcw size={20} />
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-4 gap-6 mb-12">
        <StatsCard label="Fleet Status" value={activeNodes.length > 0 ? "Operational" : "Idle"} icon={Server} color={activeNodes.length > 0 ? "text-emerald" : "text-white/40"} />
        <StatsCard label="Peak T/S" value={`${Math.max(...history.map(h => h.decode_tokens_per_sec || 0), 0).toFixed(1)}`} icon={Zap} />
        <StatsCard label="Benchmarks" value={history.length.toString()} icon={History} />
        <StatsCard label="Connection" value={isConnected ? "Secure" : "Lost"} icon={Cpu} color={isConnected ? "text-emerald" : "text-red-500"} />
      </div>

      {/* Main Content Area */}
      <div className="mb-8 flex justify-between items-center">
        <div className="flex gap-4">
           {/* Filter Bar Placeholder */}
           <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/40 text-sm">
             <Filter size={14} />
             <span>Filter by HW</span>
           </div>
        </div>

        <div className="flex gap-4 p-1 bg-white/[0.03] border border-white/10 rounded-xl">
          <button 
            onClick={() => setViewMode('grid')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white" : "text-white/30 hover:text-white/60")}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'live' ? (
          <motion.div 
            key="live"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn("grid gap-6", viewMode === 'grid' ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}
          >
            {activeNodes.length === 0 ? (
              <EmptyState message="No active nodes detected. Ensure your CLI or Server is running." />
            ) : (
              activeNodes.map(node => (
                <LiveNodeCard key={node.machine_id} node={node} onDelete={() => handleDeleteNode(node.machine_id)} />
              ))
            )}
          </motion.div>
        ) : (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {history.length === 0 ? (
              <EmptyState message="No historical telemetry found. Run an optimization to see results here." />
            ) : (
              history.map((record, i) => (
                <HistoryRow key={i} record={record} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
  <button 
    onClick={onClick}
    className={cn(
      "px-6 py-2 rounded-lg flex items-center gap-3 transition-all",
      active ? "bg-white/10 text-white shadow-xl" : "text-white/30 hover:text-white/60"
    )}
  >
    <Icon size={16} />
    <span className="text-sm font-medium">{label}</span>
    <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] border border-white/5">{count}</span>
  </button>
);

const StatsCard = ({ label, value, icon: Icon, color = "text-white" }: any) => (
  <div className="glass-card p-6 flex items-center justify-between border-white/[0.05]">
    <div>
      <p className="text-luxury-mono mb-1">{label}</p>
      <h3 className={cn("text-2xl font-bold", color)}>{value}</h3>
    </div>
    <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
      <Icon size={20} className="text-white/40" />
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full py-20 text-center border-2 border-dashed border-white/5 rounded-3xl">
    <p className="text-white/20 text-lg">{message}</p>
  </div>
);

const LiveNodeCard = ({ node, onDelete }: { node: NodeData, onDelete: () => void }) => {
  const isServer = node.machine_id.includes('local_server');
  
  return (
    <div className="glass-card p-8 group hover:bg-white/[0.04] transition-all relative overflow-hidden border-white/10">
      <div className="flex justify-between items-start mb-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" />
             <span className="text-luxury-mono text-[9px] uppercase tracking-widest text-emerald">Active</span>
             {isServer && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-bold">CORE SERVER</span>}
           </div>
           <h4 className="text-xl text-white font-medium">{node.machine_id.split('_')[0]}</h4>
           <p className="text-sm text-white/40 mt-1">{node.hardware_profile.cpu || 'Unknown CPU'}</p>
        </div>
        <button 
          onClick={onDelete}
          className="p-2 rounded-lg text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/30">Current Status</span>
          <span className="text-white/60 capitalize font-mono text-[10px]">{node.status}</span>
        </div>
        <div className="flex justify-between items-center text-sm">
          <span className="text-white/30">Last Pulse</span>
          <span className="text-white/60 font-mono text-[10px]">{new Date(node.last_seen).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

const HistoryRow = ({ record }: { record: TelemetryData }) => (
  <div className="glass-card px-8 py-5 flex items-center justify-between group hover:bg-white/[0.02] transition-all border-white/5">
    <div className="flex items-center gap-8 flex-1">
      <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center">
        <History size={18} className="text-white/20" />
      </div>
      <div>
        <p className="text-white font-medium">{record.machine_id.split('_')[0]}</p>
        <p className="text-[10px] text-white/30 mt-0.5 font-mono">{record.timestamp}</p>
      </div>
    </div>

    <div className="flex items-center gap-16">
      <div className="text-right w-24">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1">Goal</p>
        <p className="text-xs text-white/60 capitalize">{record.goal}</p>
      </div>
      <div className="text-right w-24">
        <p className="text-luxury-mono text-[9px] text-emerald/40 mb-1">Speed</p>
        <p className="text-lg text-emerald font-mono">{(record.decode_tokens_per_sec || 0).toFixed(1)} <span className="text-[10px] opacity-40">t/s</span></p>
      </div>
      <div className="text-right w-24">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1">Latency</p>
        <p className="text-lg text-white font-mono">{record.latency_range[1].toFixed(0)} <span className="text-[10px] opacity-40">ms</span></p>
      </div>
      <div className="text-right w-24">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1">RAM</p>
        <p className="text-lg text-white font-mono">{(record.memory_mb).toFixed(0)} <span className="text-[10px] opacity-40">MB</span></p>
      </div>
    </div>
  </div>
);
