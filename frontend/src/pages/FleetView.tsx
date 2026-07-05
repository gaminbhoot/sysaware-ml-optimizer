import { useState, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, LayoutGrid, List, Trash2, Activity, Filter, RefreshCcw, BarChart2, ChevronDown, Calendar } from 'lucide-react';
import { cn } from '../lib/utils';
import { useNotification } from '../context/NotificationContext';
import { FleetChart } from '../components/FleetChart';
import { Card } from '../components/ui/Card';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';

import { useFleetStream } from '../hooks/useFleetStream';
import { FleetStatsPanel } from '../components/fleet/FleetStatsPanel';
import { CLICommandLauncher } from '../components/fleet/CLICommandLauncher';
import { LiveNodeCard } from '../components/fleet/LiveNodeCard';
import { HistoryRow } from '../components/fleet/HistoryRow';

interface ConfirmConfig {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}

export const FleetView = () => {
  const { addNotification } = useNotification();
  const serverBaseUrl = `${window.location.protocol}//${window.location.host}`;

  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'charts'>('live');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showClearDropdown, setShowClearDropdown] = useState(false);
  const [statsScope, setStatsScope] = useState<'session' | 'alltime'>('session');

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const {
    activeNodes,
    history,
    pendingNode,
    isConnected,
    isRefreshing,
    fetchData,
    deleteNode,
    clearHistory,
    respondToJoinRequest
  } = useFleetStream({ addNotification });

  const getScopedHistory = useCallback(() => {
    if (statsScope === 'session') {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const sessionItems = history.filter(h => new Date(h.timestamp) >= fifteenMinsAgo);
      return sessionItems.length > 0 ? sessionItems : history.slice(0, 10);
    }
    return history;
  }, [history, statsScope]);

  const scopedHistory = getScopedHistory();

  const handleDeleteNode = useCallback(async (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remove Node',
      message: `Are you sure you want to remove node ${id} and all its benchmark history? This action cannot be undone.`,
      confirmLabel: 'Remove Node',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteNode(id);
          addNotification({
            type: 'success',
            message: `Node ${id} removed successfully.`
          });
        } catch (e) {
          addNotification({
            type: 'error',
            title: 'Delete Failed',
            message: `Failed to remove node ${id}.`
          });
        }
      }
    });
  }, [deleteNode, addNotification]);

  const handleClearHistory = useCallback(async (range: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Clear History',
      message: `Are you sure you want to clear historical telemetry for: ${range}? This data will be permanently deleted.`,
      confirmLabel: 'Clear History',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await clearHistory(range);
          addNotification({
            type: 'success',
            message: `History cleared for range: ${range}`
          });
          setShowClearDropdown(false);
        } catch (e) {
          addNotification({
            type: 'error',
            title: 'Clear Failed',
            message: `Failed to clear telemetry history.`
          });
        }
      }
    });
  }, [clearHistory, addNotification]);

  const handleJoinResponse = useCallback(async (id: string, approve: boolean) => {
    try {
      await respondToJoinRequest(id, approve);
      addNotification({
        type: approve ? 'success' : 'info',
        message: approve ? `Node ${id} approved.` : `Join request for ${id} declined.`
      });
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Action Failed',
        message: `Could not ${approve ? 'approve' : 'decline'} node ${id}.`
      });
    }
  }, [respondToJoinRequest, addNotification]);

  return (
    <div className="min-h-screen bg-background pt-10 pb-24 px-6 md:pt-14 md:pb-12 md:px-12 relative">
      <AnimatePresence>
        {pendingNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <Card className="max-w-md w-full border-transparent shadow-[0_0_50px_rgba(16,185,129,0.1)]">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald/10 flex items-center justify-center shrink-0">
                  <Activity className="text-emerald" size={24} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl text-white font-bold">Join Request</h3>
                  <p className="text-muted text-sm">A new node wants to connect.</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-xl p-4 mb-8">
                <p className="text-luxury-mono text-[10px] opacity-20 mb-1">Machine ID</p>
                <p className="text-white font-mono break-all text-xs md:text-base">{pendingNode}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleJoinResponse(pendingNode, false)}
                  className="px-4 py-3 rounded-xl bg-white/5 text-silver/60 hover:bg-white/10 transition-all font-medium text-sm md:text-base"
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
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end mb-12 lg:mb-16 gap-8">
        <div>
          <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-2">
            Fleet <span className="text-white/20 italic">Status</span>
          </h1>
          <p className="text-luxury-subheading text-muted text-sm md:text-base max-w-xl font-light">Real-time distributed telemetry, system performance, and active nodes.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 md:gap-6 w-full lg:w-auto">
          <div className="flex p-1 bg-white/[0.03] rounded-xl overflow-x-auto no-scrollbar scroll-smooth">
            <TabButton active={activeTab === 'live'} onClick={() => setActiveTab('live')} icon={Activity} label="Live" count={activeNodes.length} />
            <TabButton active={activeTab === 'charts'} onClick={() => setActiveTab('charts')} icon={BarChart2} label="Charts" />
            <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={History} label="History" count={history.length} />
          </div>

          <div className="hidden sm:block h-8 w-px bg-border" />

          <div className="flex items-center gap-4">
            <div className="flex bg-white/[0.03] border border-white/[0.05] rounded-xl p-1 text-xs">
              <button 
                onClick={() => setStatsScope('session')}
                className={cn("px-3 py-1.5 rounded-lg transition-all", statsScope === 'session' ? "bg-white/10 text-white font-medium shadow-md" : "text-silver/40 hover:text-silver/80")}
              >
                Session
              </button>
              <button 
                onClick={() => setStatsScope('alltime')}
                className={cn("px-3 py-1.5 rounded-lg transition-all", statsScope === 'alltime' ? "bg-white/10 text-white font-medium shadow-md" : "text-silver/40 hover:text-silver/80")}
              >
                All-time
              </button>
            </div>

            <button 
              onClick={fetchData}
              aria-label="Refresh telemetry data"
              className={cn("flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] text-silver/40 hover:text-silver transition-all", isRefreshing && "text-emerald")}
            >
              <RefreshCcw size={18} className={cn(isRefreshing && "animate-spin")} />
            </button>
          </div>
        </div>
      </div>

      <FleetStatsPanel activeNodes={activeNodes} scopedHistory={scopedHistory} isConnected={isConnected} />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex gap-4 w-full sm:w-auto items-center">
           <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] rounded-lg text-muted text-sm flex-1 sm:flex-none">
             <Filter size={14} />
             <span className="inline">Filter by HW</span>
           </div>

           {activeTab === 'history' && history.length > 0 && (
             <div className="relative">
                <button 
                  onClick={() => setShowClearDropdown(!showClearDropdown)}
                  aria-label="Clear telemetry history options"
                  aria-expanded={showClearDropdown}
                  className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 rounded-lg text-rose-400 text-sm hover:bg-rose-500/20 transition-all"
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
                      className="absolute left-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-2xl z-30 overflow-hidden"
                      role="menu"
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
                          role="menuitem"
                          aria-label={`Clear history for ${range.label}`}
                          className="w-full text-left px-4 py-3 text-xs font-mono text-silver/60 hover:text-silver hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between group"
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

        <div className="flex gap-2 p-1 bg-white/[0.03] border border-border rounded-xl self-end sm:self-auto">
          <button 
            onClick={() => setViewMode('grid')}
            aria-label="Switch to grid view"
            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-muted hover:text-silver")}
          >
            <LayoutGrid size={18} />
          </button>
          <button 
            onClick={() => setViewMode('list')}
            aria-label="Switch to list view"
            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white" : "text-muted hover:text-silver")}
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
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
          >
            <div className={cn("grid gap-4 md:gap-6 lg:col-span-3", viewMode === 'grid' ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")}>
              {activeNodes.length === 0 ? (
                <EmptyState message="No active nodes detected. Ensure your CLI or Server is running." />
              ) : (
                activeNodes.map(node => (
                  <LiveNodeCard key={node.machine_id} node={node} onDelete={() => handleDeleteNode(node.machine_id)} />
                ))
              )}
            </div>
            
            <div className="col-span-1">
              <CLICommandLauncher serverBaseUrl={serverBaseUrl} addNotification={addNotification} />
            </div>
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
                <HistoryRow key={`${record.machine_id}-${record.timestamp}-${i}`} record={record} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmLabel={confirmConfig.confirmLabel}
        variant={confirmConfig.variant}
      />
    </div>
  );
};

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  count?: number;
}

const TabButton = memo(({ active, onClick, icon: Icon, label, count }: TabButtonProps) => (
  <button 
    onClick={onClick}
    aria-label={`${label} tab`}
    aria-current={active ? 'page' : undefined}
    className={cn(
      "px-4 md:px-6 py-2.5 rounded-lg flex items-center gap-2 md:gap-3 transition-all shrink-0",
      active ? "bg-white/10 text-white shadow-xl" : "text-silver/30 hover:text-silver/60"
    )}
  >
    <Icon size={16} />
    <span className="text-xs md:text-sm font-medium">{label}</span>
    {count !== undefined && <span className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] border border-white/5 font-mono">{count}</span>}
  </button>
));

const EmptyState = memo(({ message }: { message: string }) => (
  <div className="col-span-full py-20 text-center rounded-3xl p-8 bg-white/[0.01]">
    <div className="w-16 h-16 rounded-full bg-white/[0.02] flex items-center justify-center mx-auto mb-6">
      <Activity size={32} className="text-silver/10" />
    </div>
    <p className="text-muted text-base md:text-lg max-w-md mx-auto leading-relaxed">{message}</p>
  </div>
));
