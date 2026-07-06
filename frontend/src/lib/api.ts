import { readSSEStream } from './sse';
import type {
  SystemProfile,
  ModelAnalysis,
  Strategy,
  TelemetryReport,
  FleetNode,
  ModelRecommendation,
  Message
} from '../types';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    let errorDetail = 'An error occurred';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // Ignored
    }
    throw new ApiError(res.status, errorDetail);
  }
  return res.json() as Promise<T>;
}

async function postRuntimeAction<T>(action: 'load' | 'unload' | 'sync', runtime: 'lmstudio' | 'ollama', host: string, port: number, modelId?: string | null): Promise<T> {
  return request<T>(`/api/${runtime}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ host, port, model_id: modelId || null })
  });
}

export const api = {
  // System Profiler
  async getSystemProfile(): Promise<SystemProfile> {
    const data = await request<{ status: string; profile: SystemProfile }>('/api/system');
    return data.profile;
  },

  // Model Manager
  async getModelRecommendations(): Promise<ModelRecommendation[]> {
    const data = await request<{ status: string; recommendations: ModelRecommendation[] }>('/api/models/recommendations');
    return data.recommendations;
  },

  async listRuntimeModels(runtime: 'lmstudio' | 'ollama', host: string, port: number): Promise<ModelAnalysis[]> {
    const data = await request<{ status: string; models: ModelAnalysis[] }>(`/api/${runtime}/models?host=${host}&port=${port}`);
    return data.models || [];
  },

  async loadRuntimeModel(runtime: 'lmstudio' | 'ollama', host: string, port: number, modelId: string): Promise<void> {
    await postRuntimeAction<void>('load', runtime, host, port, modelId);
  },

  async unloadRuntimeModel(runtime: 'lmstudio' | 'ollama', host: string, port: number, modelId?: string): Promise<void> {
    await postRuntimeAction<void>('unload', runtime, host, port, modelId);
  },

  async syncRuntimeModel(runtime: 'lmstudio' | 'ollama', host: string, port: number, modelId?: string): Promise<ModelAnalysis> {
    const data = await postRuntimeAction<{ status: string; analysis: ModelAnalysis }>('sync', runtime, host, port, modelId);
    return data.analysis;
  },

  // Prompt Optimization
  async optimizePrompt(prompt: string, intent: string): Promise<{ status: string; result?: { optimized_prompt: string; [key: string]: any } }> {
    return request<{ status: string; result?: { optimized_prompt: string; [key: string]: any } }>('/api/prompt/optimize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, intent })
    });
  },

  // Telemetry & Fleet
  async getStreamToken(): Promise<string> {
    const data = await request<{ token: string }>('/api/auth/stream-token', { method: 'POST' });
    return data.token;
  },

  async getTelemetryHistory(): Promise<TelemetryReport[]> {
    const data = await request<{ status: string; history: TelemetryReport[] }>('/api/telemetry/history');
    return data.history;
  },

  async getActiveFleetNodes(): Promise<FleetNode[]> {
    const data = await request<{ status: string; nodes: FleetNode[] }>('/api/fleet/active');
    return data.nodes;
  },

  async removeFleetNode(id: string): Promise<void> {
    await request<void>(`/api/fleet/node/${id}`, { method: 'DELETE' });
  },

  async clearTelemetryHistory(range: string): Promise<void> {
    await request<void>(`/api/telemetry/history?range_type=${range}`, { method: 'DELETE' });
  },

  async approveFleetJoin(machineId: string): Promise<void> {
    await request<void>('/api/fleet/join/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId })
    });
  },

  async rejectFleetJoin(machineId: string): Promise<void> {
    await request<void>('/api/fleet/join/reject', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machine_id: machineId })
    });
  },

    // Local File Browsing & Model Analysis
  async browseModels(): Promise<string | null> {
    const data = await request<{ status: string; path?: string }>('/api/model/browse');
    return data.path || null;
  },

  async analyzeModel(modelPath: string, unsafeLoad: boolean): Promise<{ analysis: ModelAnalysis; strategy: Strategy }> {
    const data = await request<{ status: string; analysis: ModelAnalysis; strategy: Strategy }>('/api/model/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_path: modelPath, unsafe_load: unsafeLoad })
    });
    return data;
  },

  async unloadModel(modelId?: string): Promise<void> {
    await request<void>('/api/model/unload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId || null })
    });
  },

  // Streams
  async streamDiagnostic(modelPath: string, unsafeLoad: boolean, onData: (data: any) => void, signal?: AbortSignal): Promise<void> {
    const res = await fetch('/api/diagnose/custom/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_path: modelPath, unsafe_load: unsafeLoad }),
      signal
    });
    if (!res.ok) throw new ApiError(res.status, 'Diagnostic stream connection failed');
    await readSSEStream(res, onData, signal);
  },

  async streamRuntimeTune(modelId: string, source: string, systemProfile: SystemProfile | null | any, onData: (data: any) => void, signal?: AbortSignal): Promise<void> {
    const res = await fetch('/api/tune/runtime/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: modelId, source, system_profile: systemProfile }),
      signal
    });
    if (!res.ok) throw new ApiError(res.status, 'Runtime tuning stream connection failed');
    await readSSEStream(res, onData, signal);
  },

  async streamChat(
    messages: Message[],
    modelId: string | null,
    host: string,
    port: number,
    onData: (data: any) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        model_id: modelId,
        host,
        port,
        stream: true
      }),
      signal
    });
    if (!res.ok) {
      let errorDetail = 'Chat stream connection failed';
      try {
        const errJson = await res.json();
        errorDetail = errJson.detail || errJson.message || errorDetail;
      } catch {
        // Ignored
      }
      throw new ApiError(res.status, errorDetail);
    }
    await readSSEStream(res, onData, signal);
  }
};
