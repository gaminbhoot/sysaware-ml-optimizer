import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sidebar, Settings, Trash2, Sparkles, MessageCircle, User, Bot, 
  Copy, RefreshCcw, Edit2, ChevronDown, Brain, StopCircle, Send, Command, Activity, ArrowRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';
import { TypingIndicator } from './TypingIndicator';
import type { Message, Conversation } from '../types/chat';

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

// --- Nested Helper Components ---

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
                <TypingIndicator className="inline-flex gap-0.5 ml-1" dotClassName="w-1.5 h-1.5 rounded-full bg-emerald/40" />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MessageItem = ({
  msg,
  i,
  isUser,
  parsed,
  editingMessageIndex,
  setEditingMessageIndex,
  editingMessageText,
  setEditingMessageText,
  handleEditMessageSubmit,
  handleRegenerate,
  addNotification,
  chatHistory
}: {
  msg: Message;
  i: number;
  isUser: boolean;
  parsed: any;
  editingMessageIndex: number | null;
  setEditingMessageIndex: (idx: number | null) => void;
  editingMessageText: string;
  setEditingMessageText: (text: string) => void;
  handleEditMessageSubmit: (idx: number, text: string) => void;
  handleRegenerate: (idx: number) => void;
  addNotification: (n: any) => void;
  chatHistory: Message[];
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className={cn(
        "flex gap-6 max-w-[85%] md:max-w-[75%] relative group/bubble",
        isUser ? "ml-auto flex-row-reverse" : "w-full"
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-md border",
        isUser 
          ? "bg-white/10 text-white border-white/5" 
          : "bg-emerald/10 text-emerald border-emerald/10 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
      )}>
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      {/* Message actions tooltips on hover */}
      {!isUser && msg.content && (
        <div className="absolute left-16 -top-5 p-1 rounded-xl bg-black/80 border border-white/5 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10">
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
        <div className="absolute right-16 -top-5 p-1 rounded-xl bg-black/80 border border-white/5 opacity-0 group-hover/bubble:opacity-100 transition-opacity flex items-center gap-1 z-10">
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
        isUser 
          ? "p-4.5 px-6 rounded-[22px] rounded-br-none text-[15px] leading-relaxed shadow-xl border border-white/10 bg-white/5 text-white/90 relative" 
          : "p-4 px-1 text-[15px] leading-relaxed text-white/95 relative w-full"
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
                      const match = /language-(\w+)/.exec(className || '');
                      const lang = match ? match[1] : 'code';
                      return !inline ? (
                        <div className="relative group/code mb-5 last:mb-0 rounded-2xl border border-white/5 overflow-hidden shadow-2xl bg-black/30">
                          {/* Code Block Header */}
                          <div className="flex items-center justify-between px-5 py-2.5 bg-black/50 border-b border-white/5 text-[10px] font-mono text-white/30 uppercase tracking-widest">
                            <span>{lang}</span>
                            <button
                              onClick={() => {
                                const codeText = String(children).replace(/\n$/, '');
                                navigator.clipboard.writeText(codeText);
                                addNotification({ type: 'success', message: 'Code copied' });
                              }}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-emerald transition-colors"
                              title="Copy Code"
                            >
                              <Copy size={11} />
                              <span>Copy</span>
                            </button>
                          </div>
                          <pre className={cn("p-5 overflow-x-auto font-mono text-xs leading-relaxed max-w-full scrollbar-thin", className)} {...props}>
                            <code className="text-white/90">{children}</code>
                          </pre>
                        </div>
                      ) : (
                        <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-emerald" {...props}>
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
};

// --- Main ChatWorkspace Component ---

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [chatInput]);

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
                  onClick={() => {
                    setChatInput(suggestion);
                    textareaRef.current?.focus();
                  }}
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
                <MessageItem
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
      <div className="p-6 pb-8 bg-gradient-to-t from-[#050507] via-[#050507]/90 to-transparent relative z-20 flex-shrink-0">
        <div className="max-w-3xl mx-auto relative">
          
          {/* Floating Pill Input Bar */}
          <div className="rounded-[28px] bg-[#0c0c10] border border-white/10 focus-within:border-emerald/40 transition-all shadow-xl flex items-end p-2 pl-4 pr-2.5">
            
            {/* Inline Sparkles (Optimize) Button on the Left */}
            <button
              onClick={handleInlineOptimize}
              disabled={!chatInput.trim() || isInlineOptimizing}
              className={cn(
                "p-3 rounded-full flex items-center justify-center transition-all shrink-0 mb-0.5",
                isInlineOptimizing 
                  ? "bg-emerald/10 text-emerald animate-pulse" 
                  : chatInput.trim() 
                    ? "bg-white/5 text-emerald hover:bg-white/10 hover:scale-105" 
                    : "bg-transparent text-white/20 cursor-not-allowed"
              )}
              title="Optimize prompt for hardware"
            >
              {isInlineOptimizing ? (
                <RefreshCcw size={16} className="animate-spin text-emerald" />
              ) : (
                <Sparkles size={16} className={cn(chatInput.trim() && "text-emerald")} />
              )}
            </button>

            {/* Auto-growing Textarea */}
            <textarea
              ref={textareaRef}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Message SysAware Assistant..."
              className="flex-1 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 text-white font-mono text-sm placeholder:text-white/25 resize-none py-3 px-3 min-h-[44px] max-h-[200px] leading-relaxed self-center scrollbar-thin"
              rows={1}
            />

            {/* Right side controls inside input pill */}
            <div className="flex items-center gap-2 mb-0.5 shrink-0 self-center">
              
              {/* Clickable Active Model Selector within input box */}
              <div className="relative">
                <button 
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="hidden sm:inline-flex px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white text-[9px] font-mono text-white/40 uppercase tracking-wider transition-all items-center gap-1.5 focus:outline-none"
                  disabled={isLoadingModel}
                  title="Switch Model"
                >
                  {isLoadingModel ? (
                    <RefreshCcw size={10} className="animate-spin text-emerald" />
                  ) : (
                    <Activity size={10} className="text-emerald/60" />
                  )}
                  <span>{selectedModel ? (selectedModel.length > 12 ? selectedModel.substring(0, 10) + '..' : selectedModel) : 'Select Model'}</span>
                  <ChevronDown size={10} className="opacity-40" />
                </button>

                <AnimatePresence>
                  {isModelDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 bottom-full mb-3.5 w-64 border border-white/10 rounded-xl p-2.5 shadow-2xl z-30"
                      style={{ 
                        backgroundColor: 'rgba(10, 10, 12, 0.98)',
                        backdropFilter: 'blur(24px)', 
                        WebkitBackdropFilter: 'blur(24px)' 
                      }}
                    >
                      <div className="text-[9px] font-mono uppercase tracking-widest text-white/20 px-3 py-1.5 border-b border-white/10 mb-1.5">Available Models</div>
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
                              onClick={() => {
                                handleModelChange(m.model_id);
                                setIsModelDropdownOpen(false);
                              }}
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

              {/* Integrated Send/Stop Button */}
              {isTyping ? (
                <button
                  onClick={stopGeneration}
                  aria-label="Stop Generating"
                  className="p-3 bg-red-500 text-white rounded-full hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
                >
                  <StopCircle size={16} />
                </button>
              ) : (
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim()}
                  aria-label="Send Message"
                  className="p-3 bg-emerald text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-20 flex items-center justify-center shadow-lg"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
          
          {/* Enter to analyze indicator */}
          <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-mono text-white/10 uppercase tracking-[0.2em]">
            <div className="flex items-center gap-1"><Command size={10} /> Enter to Send</div>
            <div className="w-1 h-1 rounded-full bg-white/5" />
            <div className="flex items-center gap-1"><Activity size={10} /> Hardware Ingestion Active</div>
          </div>
        </div>
      </div>

    </div>
  );
};
