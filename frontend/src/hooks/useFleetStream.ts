import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import type { TelemetryData } from '../components/FleetChart';
import type { SystemProfile } from '../types';

export interface NodeData {
  machine_id: string;
  hardware_profile: SystemProfile;
  status: string;
  last_seen: string;
}

interface UseFleetStreamProps {
  addNotification: (notif: { type: 'success' | 'error' | 'info'; title?: string; message: string }) => void;
}

export function useFleetStream({ addNotification }: UseFleetStreamProps) {
  const [activeNodes, setActiveNodes] = useState<NodeData[]>([]);
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [pendingNode, setPendingNode] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [historyList, activeNodesList] = await Promise.all([
        api.getTelemetryHistory(),
        api.getActiveFleetNodes()
      ]);
      
      setHistory(historyList || []);
      setActiveNodes(activeNodesList || []);
    } catch (e) {
      addNotification({
        type: 'error',
        title: 'Sync Failed',
        message: 'Could not connect to the telemetry server. Retrying...'
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [addNotification]);

  useEffect(() => {
    let pollInterval: number;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: number;

    const connectStream = async () => {
      if (eventSource) eventSource.close();
      
      let token = '';
      try {
        const apiKey = sessionStorage.getItem('sysaware_api_key');
        if (apiKey) {
          token = await api.getStreamToken();
        }
      } catch (e) {
        console.error("Failed to retrieve short-lived stream token:", e);
      }

      const url = token ? `/api/telemetry/stream?token=${encodeURIComponent(token)}` : '/api/telemetry/stream';
      eventSource = new EventSource(url);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        stopPolling();
        startPolling(60000); // Slow fallback polling
        fetchData(); // Immediate fetch on connect
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        stopPolling();
        startPolling(15000); // Revert to faster polling on error
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        reconnectTimeout = window.setTimeout(connectStream, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (!message || typeof message !== 'object') return;

          if (message.type === 'telemetry') {
            const data = message.data;
            if (!data || !data.machine_id) {
              console.warn("Received malformed telemetry message", message);
              return;
            }

            setHistory(prev => {
              const newData = data;
              if (!newData.timestamp) newData.timestamp = new Date().toISOString();
              const updated = [newData, ...prev.filter(h => 
                !(h.machine_id === newData.machine_id && h.timestamp === newData.timestamp)
              )];
              return updated.slice(0, 100);
            });
            
            setActiveNodes(prev => {
              const nodeIndex = prev.findIndex(n => n.machine_id === data.machine_id);
              if (nodeIndex === -1) return prev; 
              const updated = [...prev];
              updated[nodeIndex] = {
                ...updated[nodeIndex],
                last_seen: new Date().toISOString(),
                status: 'active'
              };
              return updated;
            });
          } else if (message.type === 'join_request') {
            if (message.machine_id) {
              setPendingNode(message.machine_id);
            }
          }
        } catch (e) {
          console.error("Failed to parse SSE message", e);
        }
      };
    };

    const startPolling = (ms = 15000) => {
      stopPolling();
      pollInterval = window.setInterval(fetchData, ms);
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
  }, [fetchData]);

  const deleteNode = useCallback(async (id: string) => {
    await api.removeFleetNode(id);
    await fetchData();
  }, [fetchData]);

  const clearHistory = useCallback(async (range: string) => {
    await api.clearTelemetryHistory(range);
    await fetchData();
  }, [fetchData]);

  const respondToJoinRequest = useCallback(async (id: string, approve: boolean) => {
    if (approve) {
      await api.approveFleetJoin(id);
    } else {
      await api.rejectFleetJoin(id);
    }
    setPendingNode(null);
    if (approve) {
      await fetchData();
    }
  }, [fetchData]);

  return {
    activeNodes,
    history,
    pendingNode,
    isConnected,
    isRefreshing,
    setPendingNode,
    fetchData,
    deleteNode,
    clearHistory,
    respondToJoinRequest
  };
}
