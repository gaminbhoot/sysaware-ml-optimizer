import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Server, Cpu, Zap, History, LayoutGrid, List, Trash2, Activity, Filter, RefreshCcw, BarChart2, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../context/NotificationContext';
import { FleetChart } from '../components/FleetChart';

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
  const { addNotification } = useNotification();
  const [activeNodes, setActiveNodes] = useState<NodeData[]>([]);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [pendingNode, setPendingNode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'charts'>('live');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showClearDropdown, setShowClearDropdown] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [historyRes, nodesRes] = await Promise.all([
        fetch('/api/telemetry/history'),
        fetch('/api/fleet/active')
      ]);
      
      const historyData = await historyRes.json();
      const nodesData = await nodesRes.json();

      if (historyData.status === 'success') setHistory(historyData.history || []);
      if (nodesData.status === 'success') setActiveNodes(nodesData.nodes || []);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Could not connect to the telemetry server. Retrying...'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    let pollInterval: number;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number;

    const connectStream = () => {
      if (eventSource) eventSource.close();
      
      eventSource = new EventSource('/api/telemetry/stream');
      
      eventSource.onopen = () => {
        setIsConnected(true);
        startPolling();
        fetchData(); // Immediate fetch on connect
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        stopPolling();
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        reconnectTimeout = window.setTimeout(connectStream, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'telemetry') {
            fetchData();
          } else if (message.type === 'join_request') {
            setPendingNode(message.machine_id);
          }
        } catch (e) {
          console.error("Failed to parse SSE message", e);
        }
      };
    };

    const startPolling = () => {
      stopPolling();
      pollInterval = window.setInterval(fetchData, 15000);
    };

    const stopPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
    };

    fetchData(); // Initial fetch
    connectStream();

    return () => {
      if (eventSource) eventSource.close();
      stopPolling();
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const handleDeleteNode = async (id: string) => {
    if (!confirm(`Are you sure you want to remove node ${id} and all its benchmark history?`)) return;
    
    try {
      const res = await fetch(`/api/fleet/node/${id}`, { method: 'DELETE' });
      if (res.ok) {
        addNotification({
          type: 'success',
          message: `Node ${id} removed successfully.`
        });
        fetchData();
      } else {
        throw new Error('Delete failed');
      }
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Delete Failed',
        message: `Failed to remove node ${id}.`
      });
    }
  };

  const handleClearHistory = async (range: string) => {
    if (!confirm(`Are you sure you want to clear history for: ${range}?`)) return;
    
    try {
      const res = await fetch(`/api/telemetry/history?range_type=${range}`, { method: 'DELETE' });
      if (res.ok) {
        addNotification({
          type: 'success',
          message: `History cleared for range: ${range}`
        });
        setShowClearDropdown(false);
        fetchData();
      } else {
        throw new Error('Clear failed');
      }
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Clear Failed',
        message: `Failed to clear telemetry history.`
      });
    }
  };

  const handleJoinResponse = async (id: string, approve: boolean) => {
    try {
      const endpoint = approve ? '/api/fleet/join/approve' : '/api/fleet/join/reject';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machine_id: id })
      });
      
      if (!res.ok) throw new Error('Action failed');

      setPendingNode(null);
      addNotification({
        type: approve ? 'success' : 'info',
        message: approve ? `Node ${id} approved.` : `Join request for ${id} declined.`
      });
      if (approve) fetchData();
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: `Could not ${approve ? 'approve' : 'decline'} node ${id}.`
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] p-6 md:p-12 relative">
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
              className="glass-card max-w-md w-full p-6 md:p-8 border-emerald/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald/10 border border-emerald/20 flex items-center justify-center shrink-0">
                  <Activity className="text-emerald" size={24} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl text-white font-bold">Join Request</h3>
                  <p className="text-white/40 text-sm">A new node wants to connect.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-8">
                <p className="text-luxury-mono text-[10px] text-white/20 mb-1">Machine ID</p>
                <p className="text-white font-mono break-all text-xs md:text-base">{pendingNode}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleJoinResponse(pendingNode, false)}
                  className="px-4 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all font-medium text-sm md:text-base"
                >
                  Decline
                </button>
                <button 
                  onClick={() => handleJoinResponse(pendingNode, true)}
                  className="px-4 py-3 rounded-xl bg-emerald text-white hover:bg-emerald-600 transition-all font-bold shadow-[0_0_20px_rgba(16,185,129,0.3)] text-sm md:text-base"
                >
                  Accept Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 lg:mb-16 gap-8">
        <div>
          <h1 className="text-luxury-header mb-2 tracking-tighter">Infrastructure</h1>
          <p className="text-luxury-subheading text-white/50 text-sm md:text-base max-w-xl font-light">Manage active benchmarking nodes and historical performance data across your distributed system.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full lg:w-auto">
           {/* Tab Switcher */}
          <div className="flex p-1 bg-white/[0.03] border border-white/10 rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
            <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={Activity} label="Live" count={activeNodes.length} />
            <TabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} icon={BarChart2} label="Charts" />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="History" count={history.length} />
          </div>

          <div className="hidden sm:block h-8 w-px bg-white/10" />

          <button 
            onClick={fetchData}
            className={cn("flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/10 text-white/40 hover:text-white transition-all", isRefreshing && "text-emerald")}
          >
            <RefreshCcw size={18} className={cn(isRefreshing && "animate-spin")} />
            <span className="text-xs font-medium sm:hidden">Refresh Data</span>
          </button>
        </div>
      </div>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        <StatsCard label="Fleet Status" value={activeNodes.length > 0 ? "Operational" : "Idle"} icon={Server} color={activeNodes.length > 0 ? "text-emerald" : "text-white/40"} />
        <StatsCard label="Peak Performance" value={`${Math.max(...history.map(h => h.decode_tokens_per_sec || 0), 0).toFixed(1)} T/S`} icon={Zap} />
        <StatsCard label="Total Benchmarks" value={history.length.toString()} icon={History} />
        <StatsCard label="Connection" value={isConnected ? "Active" : "Offline"} icon={Cpu} color={isConnected ? "text-emerald" : "text-red-500"} />
      </div>

      {/* Main Content Area Controls */}
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 w-full sm:w-auto items-center">
           {/* Filter Bar */}
           <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/10 rounded-lg text-white/40 text-sm flex-1 sm:flex-none">
             <Filter size={14} />
             <span className="inline">Filter by HW</span>
           </div>

           {/* Clear History Tool (Only in History Tab) */}
           {activeTab === 'history' && history.length > 0 && (
             <div className="relative">
                <button 
                  onClick={() => setShowClearDropdown(!showClearDropdown)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm hover:bg-red-500/20 transition-all"
                >
                  <Trash2 size={14} />
                  <span>Clear History</span>
                  <ChevronDown size={14} className={cn("transition-transform", showClearDropdown && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {showClearDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-2 w-48 bg-[#0A0A0A] border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden"
                    >
                      {[
                        { label: 'Today', value: 'today' },
                        { label: 'This Week', value: 'week' },
                        { label: 'This Month', value: 'month' },
                        { label: 'All Time', value: 'all' }
                      ].map((range) => (
                        <button
                          key={range.value}
                          onClick={() => handleClearHistory(range.value)}
                          className="w-full text-left px-4 py-3 text-xs font-mono text-white/60 hover:text-white hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group"
                        >
                          {range.label}
                          <Calendar size={12} className="opacity-0 group-hover:opacity-40" />
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
           )}
        </div>

        <div className="flex gap-2 p-1 bg-white/[0.03] border border-white/10 rounded-xl self-end sm:self-auto">
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
            className={cn("grid gap-4 md:gap-6", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}
          >
            {activeNodes.length === 0 ? (
              <EmptyState message="No active nodes detected. Ensure your CLI or Server is running." />
            ) : (
              activeNodes.map(node => (
                <LiveNodeCard key={node.machine_id} node={node} onDelete={() => handleDeleteNode(node.machine_id)} />
              ))
            )}
          </motion.div>
        ) : activeTab === 'charts' ? (
          <motion.div 
            key="charts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full overflow-hidden"
          >
            <FleetChart data={history} />
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
      "px-4 md:px-6 py-2.5 rounded-lg flex items-center gap-2 md:gap-3 transition-all shrink-0",
      active ? "bg-white/10 text-white shadow-xl" : "text-white/30 hover:text-white/60"
    )}
  >
    <Icon size={16} />
    <span className="text-xs md:text-sm font-medium">{label}</span>
    {count !== undefined && <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] border border-white/5 font-mono">{count}</span>}
  </button>
);

const StatsCard = ({ label, value, icon: Icon, color = "text-white" }: any) => (
  <div className="glass-card p-5 md:p-6 flex items-center justify-between border-white/[0.05] hover:border-white/10 transition-colors group">
    <div>
      <p className="text-luxury-mono mb-1 text-[9px] md:text-[11px] opacity-50 group-hover:opacity-100 transition-opacity">{label}</p>
      <h3 className={cn("text-xl md:text-2xl font-bold tracking-tight", color)}>{value}</h3>
    </div>
    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center group-hover:bg-white/[0.06] transition-all">
      <Icon size={18} className="text-white/40 group-hover:text-white/80 transition-colors" />
    </div>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full py-20 text-center border border-dashed border-white/10 rounded-3xl p-8 bg-white/[0.01]">
    <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-6">
      <Activity size={32} className="text-white/10" />
    </div>
    <p className="text-white/30 text-base md:text-lg max-w-md mx-auto leading-relaxed">{message}</p>
  </div>
);

const LiveNodeCard = ({ node, onDelete }: { node: NodeData, onDelete: () => void }) => {
  const isServer = node.machine_id.includes('local_server');
  
  return (
    <div className="glass-card p-6 md:p-8 group hover:bg-white/[0.04] transition-all relative overflow-hidden border-white/10">
      <div className="flex justify-between items-start mb-6">
        <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {isServer && <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black tracking-tighter uppercase">CORE SERVER</span>}
            </div>
            <h4 className="text-lg md:text-xl text-white font-medium truncate pr-4">{node.machine_id.split('_')[0]}</h4>

           <p className="text-xs text-white/40 mt-1 truncate">{node.hardware_profile.cpu || 'Unknown CPU'}</p>
        </div>
        <button 
          onClick={onDelete}
          className="p-2.5 rounded-xl text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all md:opacity-0 md:group-hover:opacity-100 shrink-0 border border-transparent hover:border-red-500/20"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/30">System Load</span>
          <span className="text-white/70 font-mono">Nominal</span>
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-white/30">Last Pulse</span>
          <span className="text-white/70 font-mono">{new Date(node.last_seen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
        </div>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-0 left-0 h-[2px] bg-emerald/20 w-full overflow-hidden">
        <motion.div 
          className="h-full bg-emerald shadow-[0_0_8px_#10B981]"
          initial={{ x: '-100%' }}
          animate={{ x: '100%' }}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    </div>
  );
};

const HistoryRow = ({ record }: { record: TelemetryData }) => (
  <div className="glass-card px-6 md:px-8 py-5 md:py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between group hover:bg-white/[0.04] transition-all border-white/5 gap-6 lg:gap-8">
    <div className="flex items-center gap-4 md:gap-6 flex-1 w-full min-w-0">
      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-white/20 transition-colors">
        <History size={20} className="text-white/20 group-hover:text-white/40 transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="text-white font-semibold truncate text-base md:text-lg">{record.machine_id.split('_')[0]}</p>
          <span className="hidden sm:inline px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/40 font-mono">{record.hardware_profile.os || 'N/A'}</span>
        </div>
        <p className="text-[10px] md:text-xs text-white/30 mt-1 font-mono tracking-tight">{new Date(record.timestamp).toLocaleString()}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 sm:grid-cols-4 lg:flex lg:items-center justify-items-start lg:justify-end gap-6 sm:gap-12 lg:gap-16 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-white/5">
      <div className="min-w-0">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1.5">Goal</p>
        <p className="text-[10px] md:text-xs text-white/70 capitalize font-medium">{record.goal}</p>
      </div>
      <div className="min-w-0">
        <p className="text-luxury-mono text-[9px] text-emerald/40 mb-1.5 font-bold">Throughput</p>
        <p className="text-lg md:text-xl text-emerald font-mono font-bold">{(record.decode_tokens_per_sec || 0).toFixed(1)}<span className="text-[10px] ml-1 opacity-40 font-normal italic">t/s</span></p>
      </div>
      <div className="min-w-0">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1.5">P99 Latency</p>
        <p className="text-lg md:text-xl text-white font-mono font-medium">{record.latency_range[1].toFixed(0)}<span className="text-[10px] ml-1 opacity-40 font-normal italic">ms</span></p>
      </div>
      <div className="min-w-0">
        <p className="text-luxury-mono text-[9px] text-white/20 mb-1.5">VRAM Usage</p>
        <p className="text-lg md:text-xl text-white font-mono font-medium">{(record.memory_mb).toFixed(0)}<span className="text-[10px] ml-1 opacity-40 font-normal italic">MB</span></p>
      </div>
    </div>
  </div>
);
