import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Wand2, Sparkles, Zap, 
  Send, User, Bot, Command,
  Trash2, RefreshCcw, Activity, Copy, MessageCircle, ArrowRight,
  Plus, Edit2, X, Check, StopCircle, Brain, Settings, ChevronDown, Sidebar
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isThinking?: boolean;
  thinking?: string;
  thinkingDuration?: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  systemPrompt: string;
  modelId: string;
  createdAt: number;
}

export const Prompts = () => {
  const { modelAnalysis, lmStudioHost, lmStudioPort } = useStore();
  const { addNotification } = useNotification();
  
  // Layout states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLabSidebarOpen, setIsLabSidebarOpen] = useState(true);
  const [isConversationsSidebarOpen, setIsConversationsSidebarOpen] = useState(true);

  // Conversations State (localStorage backed)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('sysaware_prompt_conversations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    return localStorage.getItem('sysaware_prompt_active_chat_id') || null;
  });

  // System Prompt & Models
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState('');

  // Conversation title edit
  const [isEditingConversationId, setIsEditingConversationId] = useState<string | null>(null);
  const [editedConversationTitle, setEditedConversationTitle] = useState('');

  // User Message Inline Edit
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  // Chat Input
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Lab State
  const [labInput, setLabInput] = useState('');
  const [labIntent, setLabIntent] = useState('general');
  const [labResult, setLabResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Initialize a default conversation if list is empty
  useEffect(() => {
    if (conversations.length === 0) {
      const defaultId = Math.random().toString(36).substring(2, 9);
      const newChat: Conversation = {
        id: defaultId,
        title: 'Hardware Optimization Chat',
        messages: [
          { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
        ],
        systemPrompt: 'You are SysAware Assistant, a hardware-aware AI. Provide concise, accurate technical advice.',
        modelId: modelAnalysis?.model_id || modelAnalysis?.model_name || 'default',
        createdAt: Date.now()
      };
      setConversations([newChat]);
      setCurrentChatId(defaultId);
    } else if (!currentChatId || !conversations.find(c => c.id === currentChatId)) {
      setCurrentChatId(conversations[0].id);
    }
  }, []);

  // Persist conversations
  useEffect(() => {
    localStorage.setItem('sysaware_prompt_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Persist active conversation id
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('sysaware_prompt_active_chat_id', currentChatId);
    } else {
      localStorage.removeItem('sysaware_prompt_active_chat_id');
    }
  }, [currentChatId]);

  // Resolve active conversation
  const activeChat = conversations.find(c => c.id === currentChatId);
  const chatHistory = activeChat ? activeChat.messages : [];

  // Sync selectedModel state when activeChat's modelId updates
  useEffect(() => {
    if (activeChat?.modelId) {
      setSelectedModel(activeChat.modelId);
    }
  }, [currentChatId, activeChat?.modelId]);

  // Scroll to chat bottom
  useEffect(() => {
    if (isChatOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, isTyping, isChatOpen]);

  // Fetch available models from backend
  const fetchAvailableModels = async () => {
    setIsModelsLoading(true);
    try {
      const host = lmStudioHost || '127.0.0.1';
      const port = lmStudioPort || 1234;
      const res = await fetch(`/api/lmstudio/models?host=${host}&port=${port}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setAvailableModels(data.models || []);
          if (data.models.length > 0 && !selectedModel) {
            const active = data.models.find((m: any) => m.model_id === modelAnalysis?.model_id);
            setSelectedModel(active ? active.model_id : data.models[0].model_id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    } finally {
      setIsModelsLoading(false);
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      fetchAvailableModels();
    }
  }, [isChatOpen, lmStudioHost, lmStudioPort]);

  // Handle model change / loading
  const handleModelChange = async (modelId: string) => {
    setIsModelDropdownOpen(false);
    setIsLoadingModel(true);
    addNotification({ type: 'info', message: `Loading model ${modelId} in LM Studio...` });
    try {
      const res = await fetch('/api/lmstudio/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_id: modelId,
          host: lmStudioHost || '127.0.0.1',
          port: lmStudioPort || 1234
        })
      });
      if (res.ok) {
        setSelectedModel(modelId);
        if (currentChatId) {
          setConversations(prev => prev.map(c => {
            if (c.id === currentChatId) {
              return { ...c, modelId };
            }
            return c;
          }));
        }
        addNotification({ type: 'success', message: `Model loaded: ${modelId}` });
      } else {
        const err = await res.json();
        addNotification({ type: 'error', title: 'Model Load Failed', message: err.detail || 'Could not load model.' });
      }
    } catch (err: any) {
      addNotification({ type: 'error', title: 'Error', message: err.message });
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Helper: Update messages list on active conversation
  const updateActiveChatMessages = (newMessages: Message[]) => {
    if (!currentChatId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === currentChatId) {
        return { ...c, messages: newMessages };
      }
      return c;
    }));
  };

  // Optimize prompt inside the Laboratory panel
  const optimizePromptAction = async () => {
    if (!labInput) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: labInput, intent: labIntent })
      });
      if (res.ok) {
        const data = await res.json();
        setLabResult(data.result);
      } else {
        throw new Error("Backend response error");
      }
    } catch (e) {
      setTimeout(() => {
        setLabResult({
          optimized_prompt: `[TASK: ${labIntent.toUpperCase()}]\n\nInstruction: ${labInput}\n\nConstraint: Maximize token efficiency.`,
          removed_words: ['please', 'I', 'want']
        });
        setIsOptimizing(false);
      }, 800);
      return;
    }
    setIsOptimizing(false);
  };

  // Streaming chat core completion
  const triggerChatStream = async (historyToSend: Message[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);

    const requestHistory = [...historyToSend];
    if (activeChat?.systemPrompt) {
      requestHistory.unshift({ role: 'system', content: activeChat.systemPrompt });
    }

    let assistantMsg: Message = { 
      role: 'assistant', 
      content: '', 
      thinking: '', 
      thinkingDuration: 0,
      isThinking: false
    };

    const finalHistory = [...historyToSend, assistantMsg];
    updateActiveChatMessages(finalHistory);

    let buffer = '';
    const startTime = Date.now();
    let hasThinkStarted = false;
    let thinkEndTime = 0;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: requestHistory,
          host: lmStudioHost || '127.0.0.1',
          port: lmStudioPort || 1234,
          model_id: selectedModel || modelAnalysis?.model_id || modelAnalysis?.model_name || 'default'
        }),
        signal: controller.signal
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.content) {
                fullContent += data.content;

                if (fullContent.includes('<think>') && !hasThinkStarted) {
                  hasThinkStarted = true;
                }

                let isStillThinking = false;
                let parsedThinking = '';
                let parsedContent = fullContent;

                if (fullContent.includes('<think>')) {
                  if (fullContent.includes('</think>')) {
                    const parts = fullContent.split('</think>');
                    parsedThinking = parts[0].replace('<think>', '');
                    parsedContent = parts.slice(1).join('</think>');
                    if (thinkEndTime === 0) {
                      thinkEndTime = Date.now();
                    }
                  } else {
                    const parts = fullContent.split('<think>');
                    parsedThinking = parts[1] || '';
                    parsedContent = '';
                    isStillThinking = true;
                  }
                }

                const duration = thinkEndTime 
                  ? parseFloat(((thinkEndTime - startTime) / 1000).toFixed(1))
                  : parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

                assistantMsg = {
                  role: 'assistant',
                  content: parsedContent,
                  thinking: parsedThinking,
                  isThinking: isStillThinking,
                  thinkingDuration: hasThinkStarted ? duration : undefined
                };

                setConversations(prev => prev.map(c => {
                  if (c.id === currentChatId) {
                    const msgs = [...c.messages];
                    msgs[msgs.length - 1] = assistantMsg;
                    return { ...c, messages: msgs };
                  }
                  return c;
                }));
              } else if (data.error) {
                addNotification({ type: 'error', title: 'Model Error', message: data.error });
                break;
              } else if (data.status === 'done') {
                break;
              }
            } catch (e) {
              console.error("SSE Parse Error:", e);
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        addNotification({ type: 'error', title: 'Connection Failed', message: e.message });
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  };

  const handleSendMessage = async (customMsg?: string) => {
    const text = customMsg || chatInput;
    if (!text.trim() || !currentChatId) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedHistory = [...chatHistory, userMsg];
    if (!customMsg) setChatInput('');

    updateActiveChatMessages(updatedHistory);
    await triggerChatStream(updatedHistory);
  };

  // Stop current active streaming
  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
      addNotification({ type: 'info', message: 'Generation stopped.' });
    }
  };

  // Inject lab optimization result into chat input
  const injectToChat = () => {
    if (labResult?.optimized_prompt) {
      if (!isChatOpen) {
        setIsChatOpen(true);
      }
      setChatInput(labResult.optimized_prompt);
      addNotification({ type: 'success', message: 'Ready in chat input.' });
    }
  };

  // Conversation Management Helpers
  const startNewChat = () => {
    const defaultId = Math.random().toString(36).substring(2, 9);
    const newChat: Conversation = {
      id: defaultId,
      title: `Conversation ${conversations.length + 1}`,
      messages: [
        { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
      ],
      systemPrompt: 'You are SysAware Assistant, a hardware-aware AI. Provide concise, accurate technical advice.',
      modelId: selectedModel || modelAnalysis?.model_id || modelAnalysis?.model_name || 'default',
      createdAt: Date.now()
    };
    setConversations(prev => [newChat, ...prev]);
    setCurrentChatId(defaultId);
    addNotification({ type: 'info', message: 'New conversation started.' });
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (id === currentChatId) {
        if (filtered.length > 0) {
          setCurrentChatId(filtered[0].id);
        } else {
          setCurrentChatId(null);
        }
      }
      return filtered;
    });
    addNotification({ type: 'success', message: 'Conversation deleted.' });
  };

  const renameChat = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, title: newTitle.trim() };
      }
      return c;
    }));
    setIsEditingConversationId(null);
  };

  // Message Actions
  const handleEditMessageSubmit = (index: number, newText: string) => {
    if (!newText.trim() || !currentChatId) return;
    const truncatedHistory = chatHistory.slice(0, index);
    const updatedUserMsg: Message = { role: 'user', content: newText };
    const finalHistory = [...truncatedHistory, updatedUserMsg];
    updateActiveChatMessages(finalHistory);
    setEditingMessageIndex(null);
    triggerChatStream(finalHistory);
  };

  const handleRegenerate = (index: number) => {
    if (!currentChatId) return;
    const prevUserMsgIndex = index - 1;
    if (prevUserMsgIndex < 0 || chatHistory[prevUserMsgIndex].role !== 'user') return;
    const finalHistory = chatHistory.slice(0, prevUserMsgIndex + 1);
    updateActiveChatMessages(finalHistory);
    triggerChatStream(finalHistory);
  };

  // Open System Instructions modal
  const openSystemPromptModal = () => {
    setTempSystemPrompt(activeChat?.systemPrompt || '');
    setShowSystemPromptModal(true);
  };

  const saveSystemPrompt = (promptText: string) => {
    if (currentChatId) {
      setConversations(prev => prev.map(c => {
        if (c.id === currentChatId) {
          return { ...c, systemPrompt: promptText };
        }
        return c;
      }));
      addNotification({ type: 'success', message: 'System instructions saved.' });
    }
    setShowSystemPromptModal(false);
  };

  const intents = [
    { id: 'general', icon: <MessageSquare size={12} /> },
    { id: 'coding', icon: <Zap size={12} /> },
    { id: 'analysis', icon: <Sparkles size={12} /> }
  ];

  // Helper parsing logic for active message
  const parseThinking = (text: string) => {
    const thinkRegex = /<think>([\s\S]*?)<\/think>/;
    const match = text.match(thinkRegex);
    if (match) {
      return {
        thinking: match[1],
        content: text.replace(thinkRegex, '').trim(),
        isThinking: false
      };
    }
    
    if (text.includes('<think>')) {
      const parts = text.split('<think>');
      return {
        thinking: parts[1] || '',
        content: '',
        isThinking: true
      };
    }
    
    return {
      thinking: '',
      content: text,
      isThinking: false
    };
  };

  // Nested Thinking Process block component
  const ThinkingBlock = ({ thinking, duration, isThinking }: { thinking: string, duration?: number, isThinking: boolean }) => {
    const [isOpen, setIsOpen] = useState(true);
    if (!thinking && !isThinking) return null;

    return (
      <div className="mb-4 rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-emerald/60">
            <Brain size={12} className={cn(isThinking && "animate-pulse text-emerald")} />
            <span>
              {isThinking 
                ? `Thinking Process... (${duration ? duration.toFixed(1) : 0}s)` 
                : `Thought Process (${duration ? duration.toFixed(1) : 0}s)`
              }
            </span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-white/20 hover:text-white transition-colors"
          >
            <ChevronDown size={14} />
          </motion.div>
        </button>
        
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              <div className="px-5 pb-4 text-[13px] font-mono leading-relaxed text-white/40 whitespace-pre-wrap border-t border-white/[0.03] pt-3">
                {thinking}
                {isThinking && (
                  <span className="inline-flex gap-0.5 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald/40 animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald/40 animate-bounce delay-200" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald/40 animate-bounce delay-300" />
                  </span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderPromptLab = (isSidebar: boolean) => {
    return (
      <div className="glass-card flex-1 flex flex-col overflow-hidden border-white/5 relative group h-full">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {/* Lab Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald/10 rounded-lg text-emerald">
                    <Sparkles size={16} />
                </div>
                <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white">Prompt Enhancer</span>
            </div>
            {(!isSidebar) && (
                <div className="flex items-center gap-4">
                    <Badge className="bg-white/5 text-white/40 border-white/10 text-[9px]">HARDWARE AWARE</Badge>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scrollbar-hide">
            {/* Lab Input Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono uppercase tracking-widest text-white/20">Semantic Raw Input</label>
                    <button onClick={() => setLabInput('')} className="text-[9px] font-mono uppercase text-red-500/40 hover:text-red-500 transition-colors">Clear</button>
                </div>
                <textarea
                    value={labInput}
                    onChange={(e) => setLabInput(e.target.value)}
                    placeholder="Enter a prompt to analyze and optimize..."
                    className={cn(
                        "w-full bg-black/40 border border-white/5 rounded-3xl p-6 text-white font-mono transition-all resize-none leading-relaxed placeholder:text-white/5 focus:outline-none focus:border-emerald/30 focus:ring-1 focus:ring-emerald/20 shadow-inner",
                        isSidebar ? "h-32 text-xs" : "h-72 text-base"
                    )}
                />
                
                <div className={cn("grid gap-3", isSidebar ? "grid-cols-3" : "grid-cols-3")}>
                    {intents.map((intent) => (
                        <button
                            key={intent.id}
                            onClick={() => setLabIntent(intent.id)}
                            className={cn(
                                "flex items-center justify-center gap-3 py-3 rounded-2xl font-mono text-[10px] uppercase tracking-widest transition-all border",
                                labIntent === intent.id ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-white/40 border-white/5 hover:text-white hover:bg-white/10'
                            )}
                        >
                            {intent.icon} {intent.id}
                        </button>
                    ))}
                </div>

                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={optimizePromptAction}
                    disabled={isOptimizing || !labInput}
                    className="w-full group relative flex items-center justify-center gap-4 py-4 bg-white text-black rounded-2xl font-mono text-xs uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
                >
                    {isOptimizing ? <RefreshCcw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                    <span>Optimize Flow</span>
                </motion.button>
            </div>

            {/* Lab Result Section */}
            <AnimatePresence>
                {labResult && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-6 pt-8 border-t border-white/5"
                    >
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-mono uppercase tracking-widest text-emerald/50">Restructured Intelligence</label>
                            <button 
                                onClick={() => {
                                    navigator.clipboard.writeText(labResult.optimized_prompt);
                                    addNotification({ type: 'success', message: 'Copied!' });
                                }}
                                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-white/5"
                            >
                                <Copy size={14} />
                            </button>
                        </div>

                        <div className={cn(
                            "bg-emerald/[0.02] p-6 rounded-3xl border border-emerald/10 font-mono leading-relaxed whitespace-pre-wrap text-white/80 shadow-2xl relative overflow-hidden",
                            isSidebar ? "text-xs p-5" : "text-sm"
                        )}>
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald/5 blur-3xl pointer-events-none" />
                            {labResult.optimized_prompt}
                        </div>

                        <button
                            onClick={injectToChat}
                            className="w-full flex items-center justify-center gap-4 py-4 bg-emerald text-black rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] group/btn"
                        >
                            <span>Inject to Chat</span>
                            <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>

                        {labResult.removed_words && !isSidebar && (
                            <div className="flex flex-wrap gap-2 pt-4">
                              <span className="text-[9px] font-mono uppercase text-white/20 w-full mb-1">Redundant tokens purged:</span>
                              {labResult.removed_words.map((w: any, i: number) => (
                                <span key={i} className="px-3 py-1 bg-red-500/5 text-red-500/50 rounded-full text-[9px] font-mono uppercase border border-red-500/10 tracking-tighter">-{w}</span>
                              ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {!labResult && !isOptimizing && (
                <div className="py-20 flex flex-col items-center justify-center text-center opacity-10">
                    <Activity size={48} strokeWidth={1} className="mb-6" />
                    <p className="text-xs font-mono uppercase tracking-[0.4em]">Engine Standby</p>
                </div>
            )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30 overflow-hidden flex flex-col h-screen">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald/[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-silver/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Unified Header */}
      <div className="relative z-10 pt-10 pb-4 md:pt-14 md:pb-6 px-6 md:px-12 max-w-[1800px] mx-auto w-full flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-6xl font-light tracking-tighter mb-1">
              Prompt <span className="text-white/20 italic">Engine</span>
            </h1>
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-mono text-white/30 uppercase tracking-[0.3em]">Hardware-Aware Optimization Lab</p>
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={cn(
              "flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-500 shadow-2xl z-20",
              isChatOpen ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            <MessageCircle size={16} className={cn("transition-transform duration-500", isChatOpen && "rotate-180")} />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">{isChatOpen ? 'Close Chat' : 'Open Chat'}</span>
          </motion.button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden px-6 md:px-12 max-w-[1800px] mx-auto w-full pb-8 gap-6">
        
        {/* CLOSED CHAT LAYOUT: Center standalone Prompt Lab */}
        {!isChatOpen && (
          <div className="w-full max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
            {renderPromptLab(false)}
          </div>
        )}

        {/* OPEN CHAT LAYOUT: Full-width Chat, left conversations, right sidebar lab */}
        {isChatOpen && (
          <div className="flex-1 flex overflow-hidden w-full h-full gap-6">
            
            {/* Conversation sidebar (Left) */}
            <AnimatePresence>
              {isConversationsSidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 260, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col border border-white/5 rounded-3xl h-full bg-white/[0.01] backdrop-blur-3xl overflow-hidden flex-shrink-0"
                >
                  <div className="p-5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Conversations</span>
                    <button 
                      onClick={startNewChat}
                      className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
                      title="New Conversation"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
                    {conversations.map((c) => {
                      const isActive = c.id === currentChatId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setCurrentChatId(c.id)}
                          className={cn(
                            "group flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all border cursor-pointer",
                            isActive 
                              ? "bg-white/5 border-white/5 text-white" 
                              : "border-transparent text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                          )}
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1">
                            <MessageSquare size={14} className="flex-shrink-0" />
                            {isEditingConversationId === c.id ? (
                              <input
                                type="text"
                                value={editedConversationTitle}
                                onChange={(e) => setEditedConversationTitle(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    renameChat(c.id, editedConversationTitle);
                                  } else if (e.key === 'Escape') {
                                    setIsEditingConversationId(null);
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                autoFocus
                                className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none w-full"
                              />
                            ) : (
                              <span className="text-xs font-mono truncate">{c.title}</span>
                            )}
                          </div>

                          {isEditingConversationId === c.id ? (
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  renameChat(c.id, editedConversationTitle);
                                }}
                                className="p-1 text-emerald hover:bg-emerald/10 rounded"
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditingConversationId(null);
                                }}
                                className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsEditingConversationId(c.id);
                                  setEditedConversationTitle(c.title);
                                }}
                                className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                              >
                                <Edit2 size={11} />
                              </button>
                              {conversations.length > 1 && (
                                <button
                                  onClick={(e) => deleteChat(c.id, e)}
                                  className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Chat Panel Area (Center) */}
            <div className="flex-1 flex flex-col glass-card border-white/5 overflow-hidden h-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
              
              {/* Chat Header */}
              <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsConversationsSidebarOpen(!isConversationsSidebarOpen)}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white border border-white/5 transition-all"
                    title="Toggle sidebar"
                  >
                    <Sidebar size={16} />
                  </button>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald leading-tight">
                      {activeChat ? activeChat.title : 'Assistant'}
                    </span>
                    <span className="text-[9px] font-mono text-white/20 uppercase tracking-[0.1em] mt-0.5">Active chat session</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Model Selector Dropdown */}
                  <div className="relative">
                    <button 
                      onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2.5 rounded-2xl border bg-white/5 text-white/60 text-xs font-mono uppercase tracking-wider hover:bg-white/10 hover:text-white transition-all",
                        isModelDropdownOpen ? "border-emerald/40 text-emerald" : "border-white/5"
                      )}
                      disabled={isLoadingModel}
                    >
                      {isLoadingModel ? (
                        <RefreshCcw size={12} className="animate-spin" />
                      ) : (
                        <Activity size={12} />
                      )}
                      <span>{selectedModel || 'Select Model'}</span>
                      <ChevronDown size={12} />
                    </button>

                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 mt-2.5 w-64 border border-white/10 rounded-2xl p-2.5 shadow-2xl z-30"
                          style={{ 
                            backgroundColor: 'rgba(10, 10, 12, 0.95)',
                            backdropFilter: 'blur(24px)', 
                            WebkitBackdropFilter: 'blur(24px)' 
                          }}
                        >
                          <div className="text-[9px] font-mono uppercase tracking-widest text-white/20 px-3 py-1.5 border-b border-white/5 mb-1.5">Available Models</div>
                          <div className="max-h-48 overflow-y-auto space-y-1 scrollbar-hide">
                            {isModelsLoading ? (
                              <div className="text-xs font-mono text-white/40 px-3 py-2 flex items-center gap-2">
                                <RefreshCcw className="w-3 h-3 animate-spin text-emerald" />
                                Loading models...
                              </div>
                            ) : availableModels.length === 0 ? (
                              <div className="text-xs font-mono text-white/20 px-3 py-2">No models loaded. Start LM Studio first.</div>
                            ) : (
                              availableModels.map((m) => (
                                <button
                                  key={m.model_id}
                                  onClick={() => handleModelChange(m.model_id)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-xl text-xs font-mono transition-all flex flex-col gap-0.5 hover:bg-white/5",
                                    selectedModel === m.model_id ? "text-emerald bg-emerald/5" : "text-white/60"
                                  )}
                                >
                                  <span>{m.model_name}</span>
                                  <span className="text-[9px] opacity-40">
                                    {m.num_params ? `${(m.num_params / 1e9).toFixed(1)}B` : ''} 
                                    {m.size_mb ? ` (${m.size_mb.toFixed(0)} MB)` : ''}
                                  </span>
                                </button>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* System instructions button */}
                  <button
                    onClick={openSystemPromptModal}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5"
                    title="System Instructions"
                  >
                    <Settings size={16} />
                  </button>

                  {/* Reset active chat */}
                  <button 
                    onClick={() => updateActiveChatMessages([{ role: 'assistant', content: 'Session reset.' }])}
                    className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all border border-white/5"
                    title="Clear Chat History"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Collapsible Lab Panel Toggle */}
                  <button
                    onClick={() => setIsLabSidebarOpen(!isLabSidebarOpen)}
                    className={cn(
                      "p-2.5 rounded-2xl border transition-all",
                      isLabSidebarOpen 
                        ? "bg-emerald/10 text-emerald border-emerald/20 hover:bg-emerald/20" 
                        : "bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white"
                    )}
                    title="Toggle Prompt Enhancer"
                  >
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 scrollbar-hide">
                {chatHistory.map((msg, i) => {
                  const isUser = msg.role === 'user';
                  const parsed = parseThinking(msg.content);
                  
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 }}
                      className={cn(
                        "flex gap-6 max-w-[90%] md:max-w-[80%] relative group/bubble",
                        isUser ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      {/* Avatar */}
                      <div className={cn(
                        "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg",
                        isUser ? "bg-white/10 text-white" : "bg-white/5 text-white/40"
                      )}>
                        {isUser ? <User size={18} /> : <Bot size={18} />}
                      </div>

                      {/* Message actions tooltips on hover */}
                      {!isUser && msg.content && (
                        <div className="absolute left-16 -top-5 p-1 rounded-xl bg-black/60 border border-white/5 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10">
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(parsed.content || msg.content);
                              addNotification({ type: 'success', message: 'Copied!' });
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                            title="Copy response"
                          >
                            <Copy size={12} />
                          </button>
                          {i > 0 && chatHistory[i-1]?.role === 'user' && (
                            <button 
                              onClick={() => handleRegenerate(i)}
                              className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                              title="Regenerate response"
                            >
                              <RefreshCcw size={12} />
                            </button>
                          )}
                        </div>
                      )}

                      {isUser && editingMessageIndex !== i && (
                        <div className="absolute right-16 -top-5 p-1 rounded-xl bg-black/60 border border-white/5 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10">
                          <button 
                            onClick={() => {
                              setEditingMessageIndex(i);
                              setEditingMessageText(msg.content);
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                            title="Edit message"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(msg.content);
                              addNotification({ type: 'success', message: 'Copied!' });
                            }}
                            className="p-1.5 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                            title="Copy message"
                          >
                            <Copy size={12} />
                          </button>
                        </div>
                      )}

                      {/* Content bubble */}
                      <div className={cn(
                        "p-7 rounded-[32px] text-[15px] leading-relaxed shadow-xl border border-white/5 relative",
                        isUser 
                          ? "bg-white text-black font-medium rounded-tr-none" 
                          : "bg-white/5 text-white/80 rounded-tl-none"
                      )}>
                        
                        {/* Inline editing for User */}
                        {isUser && editingMessageIndex === i ? (
                          <div className="flex flex-col gap-2.5 min-w-[280px]">
                            <textarea
                              value={editingMessageText}
                              onChange={(e) => setEditingMessageText(e.target.value)}
                              className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white text-xs font-mono focus:outline-none focus:border-emerald/40 resize-none min-h-[90px]"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setEditingMessageIndex(null)}
                                className="px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 text-[10px] uppercase font-mono tracking-wider hover:bg-white/10 text-white"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleEditMessageSubmit(i, editingMessageText)}
                                className="px-3 py-1.5 rounded-lg bg-emerald text-black text-[10px] uppercase font-mono tracking-wider hover:scale-102 active:scale-98 transition-transform font-bold"
                              >
                                Send
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Render Thinking block if Assistant */}
                            {!isUser && (
                              <ThinkingBlock 
                                thinking={msg.thinking || ''} 
                                duration={msg.thinkingDuration} 
                                isThinking={msg.isThinking || false} 
                              />
                            )}

                            {/* Render actual response Markdown */}
                            {parsed.content || isUser ? (
                              <div className="markdown-content whitespace-pre-wrap overflow-x-auto">
                                <ReactMarkdown 
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    code({ node, inline, className, children, ...props }: any) {
                                      return !inline ? (
                                        <div className="relative group/code mb-4 last:mb-0">
                                          <button
                                            onClick={() => {
                                              const codeText = String(children).replace(/\n$/, '');
                                              navigator.clipboard.writeText(codeText);
                                              addNotification({ type: 'success', message: 'Code copied' });
                                            }}
                                            className="absolute right-3 top-3 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/40 hover:text-white transition-all opacity-0 group-hover/code:opacity-100 z-10 border border-white/5"
                                            title="Copy Code"
                                          >
                                            <Copy size={14} />
                                          </button>
                                          <pre className={cn("p-4 rounded-2xl bg-black/40 overflow-x-auto border border-white/5 font-mono text-sm", className)} {...props}>
                                            <code className="text-white">{children}</code>
                                          </pre>
                                        </div>
                                      ) : (
                                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                          {children}
                                        </code>
                                      );
                                    }
                                  }}
                                >
                                  {isUser ? msg.content : parsed.content}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              // Render Typing indicator if empty content
                              <div className="flex gap-1.5 pt-2">
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald/60 animate-pulse" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-emerald/60 animate-pulse" />
                                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-emerald/60 animate-pulse" />
                              </div>
                            )}
                          </>
                        )}

                      </div>
                    </motion.div>
                  );
                })}
                {isTyping && chatHistory[chatHistory.length-1]?.role !== 'assistant' && (
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 shadow-lg">
                      <Bot size={18} />
                    </div>
                    <div className="bg-white/5 p-7 rounded-[32px] rounded-tl-none border border-white/5 shadow-xl">
                      <div className="flex gap-2">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-white/40" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-white/40" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-white/40" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-10 bg-white/[0.01] border-t border-white/5 backdrop-blur-2xl relative">
                
                {/* Abort button floating above input if loading */}
                {isTyping && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={stopGeneration}
                      className="flex items-center gap-2 px-5 py-2.5 bg-black border border-white/10 rounded-full text-xs font-mono uppercase text-red-400 hover:text-red-500 hover:border-red-500/20 shadow-2xl backdrop-blur-xl animate-fade-in"
                    >
                      <StopCircle size={14} />
                      <span>Stop Generating</span>
                    </motion.button>
                  </div>
                )}

                <div className="relative group/input max-w-5xl mx-auto">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Ask SysAware Assistant about optimization, models, or your system..."
                    className="w-full bg-black/60 border border-white/10 rounded-[32px] py-8 pl-10 pr-24 text-white font-mono text-sm focus:outline-none focus:border-emerald/40 transition-all placeholder:text-white/5 resize-none min-h-[100px] shadow-2xl"
                    rows={1}
                  />
                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!chatInput.trim() || isTyping}
                    aria-label="Send Message"
                    className="absolute right-4 bottom-4 p-5 bg-emerald text-black rounded-[24px] hover:scale-105 active:scale-95 transition-all disabled:opacity-30 shadow-2xl"
                  >
                    <Send size={20} />
                  </button>
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-6 text-[10px] font-mono text-white/10 uppercase tracking-[0.3em]">
                  <div className="flex items-center gap-1.5"><Command size={12} /> ENTER TO ANALYZE</div>
                  <div className="w-1.5 h-1.5 rounded-full bg-white/5" />
                  <div className="flex items-center gap-1.5"><Activity size={12} /> REAL-TIME INFERENCE</div>
                </div>
              </div>

            </div>

            {/* Collapsible Laboratory Sidebar (Right) */}
            <AnimatePresence>
              {isLabSidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 420, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0 h-full overflow-hidden flex flex-col border border-white/5 rounded-3xl"
                >
                  {renderPromptLab(true)}
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>

      {/* System Prompt Modal Overlay */}
      <AnimatePresence>
        {showSystemPromptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-lg w-full border border-white/10 overflow-hidden rounded-[32px] shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Settings className="text-emerald" size={16} />
                  <span className="text-xs font-mono uppercase tracking-widest text-white">System Instructions</span>
                </div>
                <button 
                  onClick={() => setShowSystemPromptModal(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-[11px] font-mono text-white/40 leading-relaxed">
                  Provide custom instructions that guide the behavior of the assistant throughout the chat.
                </p>
                <textarea
                  value={tempSystemPrompt}
                  onChange={(e) => setTempSystemPrompt(e.target.value)}
                  placeholder="e.g. You are a senior CUDA engineer. Keep details highly technical..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-mono focus:outline-none focus:border-emerald/40 resize-none min-h-[140px] leading-relaxed"
                />
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                <button
                  onClick={() => setShowSystemPromptModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[10px] uppercase font-mono tracking-wider hover:bg-white/10 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveSystemPrompt(tempSystemPrompt)}
                  className="px-4 py-2.5 rounded-xl bg-emerald text-black text-[10px] uppercase font-mono tracking-wider hover:scale-102 active:scale-98 transition-transform font-bold"
                >
                  Save Instructions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-3 py-1 rounded-full text-[9px] font-mono tracking-widest border uppercase", className)}>
    {children}
  </span>
);
