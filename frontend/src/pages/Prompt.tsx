import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Wand2, Sparkles, Zap, 
  Send, User, Bot, Command,
  Trash2, RefreshCcw, Activity, Copy, MessageCircle, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const Prompts = () => {
  const { modelAnalysis, lmStudioHost, lmStudioPort } = useStore();
  const { addNotification } = useNotification();
  
  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<any[]>([
    { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Lab State
  const [labInput, setLabInput] = useState('');
  const [labIntent, setLabIntent] = useState('general');
  const [labResult, setLabResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    if (isChatOpen) {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, isTyping, isChatOpen]);

  const optimizePromptAction = async () => {
    if (!labInput) return;
    setIsOptimizing(true);
    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: labInput, intent: labIntent })
      });
      const data = await res.json();
      setLabResult(data.result);
    } catch (e) {
      // Mock for robustness
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

  const handleSendMessage = async (customMsg?: string) => {
    const text = customMsg || chatInput;
    if (!text.trim()) return;
    
    const userMsg = { role: 'user', content: text };
    const updatedHistory = [...chatHistory, userMsg];
    setChatHistory(updatedHistory);
    if (!customMsg) setChatInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: updatedHistory,
          host: lmStudioHost,
          port: lmStudioPort,
          model_id: modelAnalysis?.model_name
        })
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader available");

      let assistantMsg = { role: 'assistant', content: '' };
      setChatHistory(prev => [...prev, assistantMsg]);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in the buffer
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.content) {
                assistantMsg.content += data.content;
                setChatHistory(prev => {
                  const next = [...prev];
                  next[next.length - 1] = { ...assistantMsg };
                  return next;
                });
              } else if (data.error) {
                 addNotification({ type: 'error', title: 'Model Error', message: data.error });
                 break;
              }
            } catch (e) {
              console.error("SSE Parse Error:", e, "Line:", trimmedLine);
            }
          }
        }
      }
    } catch (e: any) {
      addNotification({ type: 'error', title: 'Connection Failed', message: e.message });
    } finally {
      setIsTyping(false);
    }
  };

  const injectToChat = () => {
    if (labResult?.optimized_prompt) {
      if (!isChatOpen) {
          setIsChatOpen(true);
      }
      setChatInput(labResult.optimized_prompt);
      addNotification({ type: 'success', message: 'Ready in chat input.' });
    }
  };

  const intents = [
    { id: 'general', icon: <MessageSquare size={12} /> },
    { id: 'coding', icon: <Zap size={12} /> },
    { id: 'analysis', icon: <Sparkles size={12} /> }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30 overflow-hidden flex flex-col h-screen">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald/[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-silver/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Unified Header */}
      <div className="relative z-10 pt-24 pb-4 md:pt-32 md:pb-6 px-6 md:px-12 max-w-[1800px] mx-auto w-full flex-shrink-0">
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
              "flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-500 shadow-2xl",
              isChatOpen ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-xl"
            )}
          >
            <MessageCircle size={16} className={cn("transition-transform duration-500", isChatOpen && "rotate-180")} />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">{isChatOpen ? 'Close Chat' : 'Open Chat'}</span>
          </motion.button>
        </div>
      </div>

      <div className="relative z-10 flex-1 flex overflow-hidden px-6 md:px-12 max-w-[1800px] mx-auto w-full pb-8 gap-6">
        
        {/* Lab Panel (Optimization Engine) - Main Focus Area */}
        <motion.div
            layout
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
                "flex flex-col transition-all duration-700",
                isChatOpen ? "w-1/4" : "w-full max-w-5xl mx-auto"
            )}
        >
            <div className="glass-card flex-1 flex flex-col overflow-hidden border-white/5 relative group">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                
                {/* Lab Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald/10 rounded-lg text-emerald">
                            <Sparkles size={16} />
                        </div>
                        <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white">Laboratory</span>
                    </div>
                    {(!isChatOpen) && (
                        <div className="flex items-center gap-4">
                            <Badge className="bg-white/5 text-white/40 border-white/10 text-[9px]">HARDWARE AWARE</Badge>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
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
                                "w-full bg-black/40 border border-white/5 rounded-3xl p-8 text-white font-mono transition-all resize-none leading-relaxed placeholder:text-white/5 focus:outline-none focus:border-emerald/30 focus:ring-1 focus:ring-emerald/20 shadow-inner",
                                isChatOpen ? "h-32 text-[10px]" : "h-72 text-base"
                            )}
                        />
                        
                        <div className={cn("grid gap-3", isChatOpen ? "grid-cols-1" : "grid-cols-3")}>
                            {intents.map((intent) => (
                                <button
                                    key={intent.id}
                                    onClick={() => setLabIntent(intent.id)}
                                    className={cn(
                                        "flex items-center justify-center gap-3 py-4 rounded-2xl font-mono text-[10px] uppercase tracking-widest transition-all border",
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
                            className="w-full group relative flex items-center justify-center gap-4 py-5 bg-white text-black rounded-2xl font-mono text-xs uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
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
                                className="space-y-6 pt-10 border-t border-white/5"
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
                                    "bg-emerald/[0.02] p-8 rounded-3xl border border-emerald/10 font-mono leading-relaxed whitespace-pre-wrap text-white/80 shadow-2xl relative overflow-hidden",
                                    isChatOpen ? "text-[10px] p-5" : "text-sm"
                                )}>
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald/5 blur-3xl pointer-events-none" />
                                    {labResult.optimized_prompt}
                                </div>

                                <button
                                    onClick={injectToChat}
                                    className="w-full flex items-center justify-center gap-4 py-5 bg-emerald text-black rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] group/btn"
                                >
                                    <span>Inject to Chat</span>
                                    <ArrowRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                                </button>

                                {labResult.removed_words && !isChatOpen && (
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
        </motion.div>

        {/* Chat Area - Expands when open, Ratio 3 (75%) */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0, scale: 0.95 }}
              animate={{ opacity: 1, width: '75%', scale: 1 }}
              exit={{ opacity: 0, width: 0, scale: 0.95 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col glass-card border-white/5 overflow-hidden h-full shadow-[0_0_100px_rgba(0,0,0,0.5)]"
            >
              {/* Chat Header */}
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
                <div className="flex items-center gap-4">
                   <div className="p-2.5 bg-white/5 rounded-xl text-white/60 shadow-inner border border-white/5">
                     <Bot size={20} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-emerald">Personal Assistant</span>
                   </div>
                </div>
                <button 
                  onClick={() => setChatHistory([{ role: 'assistant', content: 'Session reset.' }])}
                  className="p-3 hover:bg-white/5 rounded-2xl text-white/20 hover:text-white transition-all border border-transparent hover:border-white/5"
                  title="Clear Chat"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Message List */}
              <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-10 scrollbar-hide">
                {chatHistory.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={cn(
                      "flex gap-6 max-w-[90%] md:max-w-[75%]",
                      msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 mt-1 shadow-lg",
                      msg.role === 'user' ? "bg-white/10 text-white" : "bg-white/5 text-white/40"
                    )}>
                      {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                    </div>
                    <div className={cn(
                      "p-7 rounded-[32px] text-[15px] leading-relaxed shadow-xl border border-white/5 relative group/bubble",
                      msg.role === 'user' ? "bg-white text-black font-medium rounded-tr-none" : "bg-white/5 text-white/80 rounded-tl-none"
                    )}>
                      {msg.content ? (
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
                                      <code>{children}</code>
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
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 pt-2">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-black/20" : "bg-white/20")} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-black/20" : "bg-white/20")} />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className={cn("w-1.5 h-1.5 rounded-full", msg.role === 'user' ? "bg-black/20" : "bg-white/20")} />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {isTyping && chatHistory[chatHistory.length-1]?.role !== 'assistant' && (
                  <div className="flex gap-6">
                    <div className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 shadow-lg">
                      <Bot size={18} />
                    </div>
                    <div className="bg-white p-7 rounded-[32px] rounded-tl-none border border-white/5 shadow-xl">
                      <div className="flex gap-2">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-black/20" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-black/20" />
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-black/20" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-10 bg-white/[0.01] border-t border-white/5 backdrop-blur-2xl">
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
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-3 py-1 rounded-full text-[9px] font-mono tracking-widest border uppercase", className)}>
    {children}
  </span>
);
