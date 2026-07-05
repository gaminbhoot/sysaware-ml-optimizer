import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar, Settings, Trash2, Sparkles, MessageCircle, Bot, ArrowRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { TypingIndicator } from './TypingIndicator';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInputArea } from './chat/ChatInputArea';
import type { Message, Conversation } from '../types';

interface ChatWorkspaceProps {
  activeChat: Conversation | undefined;
  addNotification: (n: any) => void;
  availableModels: any[];
  chatHistory: Message[];
  chatInput: string;
  editingMessageIndex: number | null;
  editingMessageText: string;
  handleEditMessageSubmit: (idx: number, text: string) => void;
  handleInlineOptimize: () => Promise<void>;
  handleModelChange: (id: string) => Promise<void>;
  handleRegenerate: (idx: number) => void;
  handleSendMessage: (customMsg?: string) => Promise<void>;
  HARDWARE_SUGGESTIONS: string[];
  isConversationsSidebarOpen: boolean;
  isInitialState: boolean;
  isInlineOptimizing: boolean;
  isLabSidebarOpen: boolean;
  isLoadingModel: boolean;
  isModelDropdownOpen: boolean;
  isModelsLoading: boolean;
  isTyping: boolean;
  openSystemPromptModal: () => void;
  selectedModel: string;
  setChatInput: (input: string) => void;
  setEditingMessageIndex: (idx: number | null) => void;
  setEditingMessageText: (text: string) => void;
  setIsChatOpen: (open: boolean) => void;
  setIsConversationsSidebarOpen: (open: boolean) => void;
  setIsLabSidebarOpen: (open: boolean) => void;
  setIsModelDropdownOpen: (open: boolean) => void;
  stopGeneration: () => void;
  updateActiveChatMessages: (msgs: Message[]) => void;
}

export const ChatWorkspace = ({
  activeChat,
  addNotification,
  availableModels,
  chatHistory,
  chatInput,
  editingMessageIndex,
  editingMessageText,
  handleEditMessageSubmit,
  handleInlineOptimize,
  handleModelChange,
  handleRegenerate,
  handleSendMessage,
  HARDWARE_SUGGESTIONS,
  isConversationsSidebarOpen,
  isInitialState,
  isInlineOptimizing,
  isLabSidebarOpen,
  isLoadingModel,
  isModelDropdownOpen,
  isModelsLoading,
  isTyping,
  openSystemPromptModal,
  selectedModel,
  setChatInput,
  setEditingMessageIndex,
  setEditingMessageText,
  setIsChatOpen,
  setIsConversationsSidebarOpen,
  setIsLabSidebarOpen,
  setIsModelDropdownOpen,
  stopGeneration,
  updateActiveChatMessages
}: ChatWorkspaceProps) => {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when history or typing changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

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

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full bg-[#050507] relative z-10">
      
      {/* Soothing Radial Background Ambient Gradient (Gemini style) */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(16,185,129,0.035),rgba(99,102,241,0.07),transparent_50%)] pointer-events-none z-0" />
      
      {/* Chat Header */}
      <div className="p-4 px-6 border-b border-white/10 flex items-center justify-between bg-[#0a0a0c]/40 backdrop-blur-md relative z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsConversationsSidebarOpen(!isConversationsSidebarOpen)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white border border-white/10 transition-all"
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
          {/* System instructions button */}
          <button
            onClick={openSystemPromptModal}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-white/10"
            title="System Instructions"
          >
            <Settings size={16} />
          </button>

          {/* Reset active chat */}
          <button 
            onClick={() => updateActiveChatMessages([{ role: 'assistant', content: 'Session reset.' }])}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-white/10"
            title="Clear Chat History"
          >
            <Trash2 size={16} />
          </button>

          {/* Collapsible Lab Panel Toggle */}
          <button
            onClick={() => setIsLabSidebarOpen(!isLabSidebarOpen)}
            className={cn(
              "p-2.5 rounded-xl border transition-all",
              isLabSidebarOpen 
                ? "bg-emerald/10 text-emerald border-emerald/20 hover:bg-emerald/20" 
                : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10 hover:text-white"
            )}
            title="Toggle Prompt Enhancer"
          >
            <Sparkles size={16} />
          </button>

          {/* Exit Chat button */}
          <button
            onClick={() => setIsChatOpen(false)}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white border border-white/10 transition-all flex items-center gap-2"
            title="Close Chat"
          >
            <MessageCircle size={16} className="rotate-180 text-emerald" />
            <span className="hidden lg:inline text-[10px] font-mono uppercase tracking-wider">Exit Chat</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 scrollbar-hide relative z-10">
        {isInitialState ? (
          <div className="flex flex-col items-center justify-center min-h-[70%] max-w-2xl mx-auto text-center px-4">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald mb-8 shadow-[0_0_30px_rgba(16,185,129,0.15)] shrink-0"
            >
              <Sparkles size={28} className="text-emerald animate-pulse" />
            </motion.div>
            
            <h2 className="text-3xl font-light tracking-tight text-white/90 mb-4 font-sans leading-snug">
              What can I help you optimize today?
            </h2>
            <p className="text-xs font-mono text-white/30 uppercase tracking-[0.2em] mb-12">
              SysAware Hardware-Aware Assistant
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 w-full max-w-xl">
              {HARDWARE_SUGGESTIONS.map((suggestion, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.03)" }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setChatInput(suggestion)}
                  className="p-4 rounded-xl border border-white/10 bg-[#0c0c10]/40 text-left text-xs font-mono text-white/50 hover:text-white/80 transition-all flex items-center justify-between group/chip cursor-pointer"
                >
                  <span className="pr-4 line-clamp-2 leading-relaxed">{suggestion}</span>
                  <ArrowRight size={12} className="opacity-0 group-hover/chip:opacity-100 transition-opacity text-emerald shrink-0" />
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full flex-grow flex flex-col space-y-10">
            {chatHistory.map((msg, i) => {
              const isUser = msg.role === 'user';
              const parsed = parseThinking(msg.content);
              
              return (
                <MessageBubble
                  key={i}
                  msg={msg}
                  i={i}
                  isUser={isUser}
                  parsed={parsed}
                  editingMessageIndex={editingMessageIndex}
                  setEditingMessageIndex={setEditingMessageIndex}
                  editingMessageText={editingMessageText}
                  setEditingMessageText={setEditingMessageText}
                  handleEditMessageSubmit={handleEditMessageSubmit}
                  handleRegenerate={handleRegenerate}
                  addNotification={addNotification}
                  chatHistory={chatHistory}
                />
              );
            })}
            {isTyping && chatHistory[chatHistory.length-1]?.role !== 'assistant' && (
              <div className="flex gap-6 w-full max-w-[85%] md:max-w-[75%]">
                <div className="w-9 h-9 rounded-full bg-emerald/10 border border-emerald/10 flex items-center justify-center text-emerald shadow-md shrink-0 mt-1">
                  <Bot size={16} />
                </div>
                <div className="bg-transparent p-4 px-1 rounded-none border-0 text-sm w-full">
                  <TypingIndicator />
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Chat Input */}
      <ChatInputArea
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleInlineOptimize={handleInlineOptimize}
        isInlineOptimizing={isInlineOptimizing}
        handleSendMessage={handleSendMessage}
        isTyping={isTyping}
        stopGeneration={stopGeneration}
        selectedModel={selectedModel}
        availableModels={availableModels}
        isLoadingModel={isLoadingModel}
        isModelsLoading={isModelsLoading}
        handleModelChange={handleModelChange}
        isModelDropdownOpen={isModelDropdownOpen}
        setIsModelDropdownOpen={setIsModelDropdownOpen}
      />

    </div>
  );
};
