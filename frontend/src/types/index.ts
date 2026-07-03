export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isThinking?: boolean;
  thinking?: string;
  thinkingDuration?: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  modelId: string;
  createdAt: number;
}

export interface SystemProfile {
  cpu_cores: number;
  cpu_name?: string;
  cpu?: string;
  ram_gb: number;
  ram_available_gb?: number;
  gpu_available: boolean;
  gpu_backend?: string;
  gpu_vram_gb: number;
  gpu_name: string;
  dgpu_name?: string;
  dgpu_vram_gb?: number;
  igpu_name?: string;
  igpu_vram_gb?: number;
  npu_available: boolean;
  npu_name?: string;
  tflops_fp16?: number;
  bandwidth_gb_s?: number;
  os: string;
  machine_id?: string;
}

export interface LayerTypes {
  Architecture: string;
  Quantization: string;
  Format: string;
}

export interface ModelAnalysis {
  model_name: string;
  model_id: string;
  base_id: string;
  num_params: number;
  trainable_params: number;
  size_mb: number;
  layer_types: LayerTypes;
  is_external: boolean;
  external_source: string;
  path: string;
  loaded: boolean;
}

export interface Strategy {
  mode: string;
  device: string;
  concurrency_limit: number;
  optimizations: string[];
  rationale: string;
}

export interface TelemetryReport {
  id?: number;
  machine_id: string;
  model_hash: string;
  hardware_profile: SystemProfile;
  goal: string;
  latency_range: [number, number];
  memory_mb: number;
  decode_tokens_per_sec?: number;
  prefill_latency_ms?: number;
  timestamp: string;
  last_seen?: string;
}

export interface BlacklistEntry {
  id?: number;
  machine_id: string;
  backend: string;
  reason: string;
  timestamp?: string;
}

export interface FleetNode {
  machine_id: string;
  hardware_profile: SystemProfile;
  status: string;
  last_seen: string;
}

export interface ModelRecommendation {
  name: string;
  model_id: string;
  params: string;
  size: string;
  quantization: string;
  min_ram_vram: string;
  suitability: string;
}
