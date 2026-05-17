import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Wand2, Sparkles, Zap, 
  Send, User, Bot, Command, Sidebar as SidebarIcon,
  Trash2, Cpu, RefreshCcw, Activity
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';

export const Prompts = () => {
  const { modelAnalysis } = useStore();
  const [promptInput, setPromptInput] = useState('');
  const [promptIntent, setPromptIntent] = useState('general');
  const [promptResult, setPromptResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  
  // Chat Mode State
  const [isChatMode, setIsChatMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<any[]>([
    { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const optimizePromptAction = async () => {
    if (!promptInput) return;
    setLoading(true);
    try {
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput, intent: promptIntent })
      });
      const data = await res.json();
      setPromptResult(data.result);
    } catch (e) {
      // Mock result for demo
      setTimeout(() => {
        setPromptResult({
          optimized_prompt: `[TASK: ${promptIntent.toUpperCase()}]\n\nInstruction: ${promptInput}\n\nConstraint: Maximize token efficiency.`,
          removed_words: ['please', 'I', 'want']
        });
        setLoading(false);
      }, 800);
      return;
    }
    setLoading(false);
  };

  const handleSendMessage = async () => {
    if (!promptInput.trim()) return;
    
    const userMsg = { role: 'user', content: promptInput };
    setChatHistory(prev => [...prev, userMsg]);
    setPromptInput('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...chatHistory, userMsg] })
      });

      const reader = response.body?.getReader();
      if (!reader) return;

      let assistantMsg = { role: 'assistant', content: '' };
      setChatHistory(prev => [...prev, assistantMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.content) {
              assistantMsg.content += data.content;
              setChatHistory(prev => {
                const next = [...prev];
                next[next.length - 1] = { ...assistantMsg };
                return next;
              });
            }
          }
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTyping(false);
    }
  };

  const intents = [
    { id: 'general', icon: <MessageSquare size={12} /> },
    { id: 'coding', icon: <Zap size={12} /> },
    { id: 'analysis', icon: <Sparkles size={12} /> }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30 overflow-hidden flex flex-col">
      {/* Dynamic Header */}
      <div className="pt-24 pb-8 md:pt-32 md:pb-6 px-6 md:px-12 max-w-[1600px] mx-auto w-full">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl md:text-5xl font-light tracking-tighter mb-2">
              Prompt <span className="text-white/20 italic">Engine</span>
            </h1>
            <p className="text-xs font-mono text-white/30 uppercase tracking-[0.3em]">
              {isChatMode ? 'Interactive Hardware-Aware Chat' : 'Semantic Restructuring Interface'}
            </p>
          </div>

          <button 
            onClick={() => setIsChatMode(!isChatMode)}
            className="group flex items-center gap-3 px-6 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <div className={cn("w-2 h-2 rounded-full", isChatMode ? "bg-emerald animate-pulse" : "bg-white/20")} />
            <span className="text-[10px] font-mono uppercase tracking-widest">{isChatMode ? 'Exit Chat' : 'Enter Chat Mode'}</span>
          </button>
        </motion.div>
      </div>

      <div className="flex-1 relative flex overflow-hidden px-6 md:px-12 max-w-[1600px] mx-auto w-full pb-12 gap-8">
        
        {/* Main Content Area */}
        <div className={cn(
          "flex-1 flex flex-col transition-all duration-500",
          isChatMode ? "gap-4" : "gap-8"
        )}>
          
          <AnimatePresence mode="wait">
            {!isChatMode ? (
              <motion.div
                key="injection"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex flex-col gap-8 h-full"
              >
                <div className="glass-card p-8 flex flex-col gap-6 relative group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                  
                  <textarea
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Paste your raw LLM instruction for restructuring..."
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-8 text-white font-mono text-sm focus:outline-none focus:border-emerald/30 focus:ring-1 focus:ring-emerald/30 transition-all resize-none min-h-[300px] leading-relaxed placeholder:text-white/10"
                  />

                  <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
                    <div className="flex p-1 bg-white/5 rounded-xl gap-1 w-full md:w-auto">
                      {intents.map((intent) => (
                        <button
                          key={intent.id}
                          onClick={() => setPromptIntent(intent.id)}
                          className={cn(
                            "flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all",
                            promptIntent === intent.id ? 'bg-white text-black' : 'text-white/40 hover:text-white hover:bg-white/5'
                          )}
                        >
                          {intent.icon} {intent.id}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={optimizePromptAction}
                      disabled={loading || !promptInput}
                      className="w-full md:w-auto group relative flex items-center justify-center gap-4 px-12 py-5 bg-emerald text-black rounded-2xl font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? <RefreshCcw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                      <span>Restructure Intent</span>
                    </button>
                  </div>
                </div>

                {promptResult && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-8 border-emerald/20">
                    <div className="flex items-center justify-between mb-8 text-[10px] font-mono uppercase tracking-widest text-emerald/60">
                      <div className="flex items-center gap-2"><Sparkles size={14} /> Optimized Output</div>
                      <button onClick={() => navigator.clipboard.writeText(promptResult.optimized_prompt)} className="hover:text-white transition-colors">[ COPY ]</button>
                    </div>
                    <div className="bg-emerald/[0.03] p-8 rounded-2xl border border-emerald/10 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                      {promptResult.optimized_prompt}
                    </div>
                    {promptResult.removed_words && (
                      <div className="mt-8 flex flex-wrap gap-2">
                        {promptResult.removed_words.map((w: any, i: number) => (
                          <span key={i} className="px-3 py-1 bg-red-500/5 text-red-500/40 rounded-full text-[9px] font-mono uppercase">{w}</span>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex flex-col h-full glass-card overflow-hidden"
              >
                {/* Chat Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald/10 flex items-center justify-center text-emerald">
                      <Bot size={18} />
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-white/80 uppercase tracking-widest">SysAware Assistant</div>
                      <div className="text-[9px] font-mono text-emerald/60 uppercase tracking-tighter">Inference Optimized</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setChatHistory([{ role: 'assistant', content: 'Chat reset.' }])} className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-white/30 hover:text-white transition-colors">
                      <SidebarIcon size={16} />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                  {chatHistory.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex gap-4 max-w-[85%]",
                        msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                        msg.role === 'user' ? "bg-white/10 text-white" : "bg-emerald/10 text-emerald"
                      )}>
                        {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <div className={cn(
                        "p-5 rounded-2xl text-sm leading-relaxed",
                        msg.role === 'user' ? "bg-white/5 text-white" : "bg-emerald/[0.03] border border-emerald/10 text-white/80 font-mono"
                      )}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}
                  {isTyping && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-emerald/10 flex items-center justify-center text-emerald">
                        <Bot size={14} />
                      </div>
                      <div className="bg-emerald/[0.03] p-5 rounded-2xl">
                        <div className="flex gap-1">
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 rounded-full bg-emerald" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-emerald" />
                          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-emerald" />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="p-8 bg-white/[0.02] border-t border-white/5">
                  <div className="relative group/input">
                    <input
                      type="text"
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Ask anything about your model or hardware..."
                      className="w-full bg-black/60 border border-white/10 rounded-2xl py-6 pl-8 pr-20 text-white font-mono text-sm focus:outline-none focus:border-emerald/40 transition-all placeholder:text-white/10"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!promptInput.trim()}
                      aria-label="Send Message"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-4 bg-emerald text-black rounded-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                  <div className="mt-4 flex items-center justify-center gap-4 text-[9px] font-mono text-white/20 uppercase tracking-[0.2em]">
                    <div className="flex items-center gap-1"><Command size={10} /> Enter to send</div>
                    <div className="w-1 h-1 rounded-full bg-white/10" />
                    <div className="flex items-center gap-1"><Cpu size={10} /> {modelAnalysis?.model_name || 'No model loaded'}</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Sidebar (Optimizer Status) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0, x: 20 }}
              animate={{ width: 380, opacity: 1, x: 0 }}
              exit={{ width: 0, opacity: 0, x: 20 }}
              className="hidden lg:flex flex-col gap-6 sticky top-32 h-fit"
            >
              <div className="glass-card p-8 flex flex-col gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald/10 rounded-lg text-emerald">
                    <Activity size={18} />
                  </div>
                  <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Runtime Stats</h3>
                </div>

                <div className="space-y-6">
                  <div className="p-6 bg-white/[0.03] rounded-2xl border border-white/5">
                    <div className="text-[9px] font-mono text-white/30 uppercase mb-4 tracking-widest">Active Model Profile</div>
                    <div className="flex justify-between items-end">
                      <div className="font-mono text-2xl tracking-tighter truncate max-w-[150px]">
                        {modelAnalysis?.model_name || 'Idle'}
                      </div>
                      <div className="text-xs text-emerald font-mono">
                        {modelAnalysis?.num_params ? `${(modelAnalysis.num_params / 1e9).toFixed(1)}B` : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="text-[8px] font-mono text-white/20 uppercase mb-1">Latency</div>
                      <div className="text-sm font-mono text-white/70">12ms <span className="text-[10px] opacity-30">avg</span></div>
                    </div>
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="text-[8px] font-mono text-white/20 uppercase mb-1">VRAM</div>
                      <div className="text-sm font-mono text-white/70">{(modelAnalysis?.size_mb || 0 / 1024).toFixed(1)}GB</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-white/5">
                    {[
                      { label: "Predictor", value: "RandomForest-v2" },
                      { label: "Confidence", value: "94.2%" },
                      { label: "Optimized", value: "Active" }
                    ].map((s, i) => (
                      <div key={i} className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-white/20 uppercase">{s.label}</span>
                        <span className="text-white/60">{s.value}</span>
                      </div>
                    ))}
                  </div>

                  <button className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-white text-black font-mono text-[9px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all">
                    Apply Optimization
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};
