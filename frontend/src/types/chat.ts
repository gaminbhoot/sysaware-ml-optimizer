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
