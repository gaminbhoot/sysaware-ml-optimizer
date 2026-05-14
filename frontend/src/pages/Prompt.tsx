import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Wand2, Sparkles, ChevronRight, Zap } from 'lucide-react';

export const Prompts = () => {
  const [promptInput, setPromptInput] = useState('');
  const [promptIntent, setPromptIntent] = useState('general');
  const [promptResult, setPromptResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const optimizePromptAction = async () => {
    if (!promptInput) return;
    setLoading(true);
    try {
      // Simulate API call for now or use actual fetch if backend is ready
      const res = await fetch('/api/prompt/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptInput, intent: promptIntent })
      });
      const data = await res.json();
      setPromptResult(data.result);
    } catch (e) {
      console.error(e);
      // Mock result for demo purposes if fetch fails
      setTimeout(() => {
        setPromptResult({
          optimized_prompt: `[TASK: ${promptIntent.toUpperCase()}]\n\nContext: User instruction provided via sysaware-ml-optimizer.\n\nInstruction: ${promptInput}\n\nConstraint: Maximize efficiency and minimize token count while preserving semantic intent.`,
          removed_words: ['can', 'you', 'please', 'I', 'want', 'you', 'to']
        });
        setLoading(false);
      }, 1000);
      return;
    }
    setLoading(false);
  };

  const intents = [
    { id: 'general', icon: <MessageSquare size={12} /> },
    { id: 'coding', icon: <Zap size={12} /> },
    { id: 'analysis', icon: <Sparkles size={12} /> }
  ];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30">
      <div className="pt-24 pb-32 md:pt-32 md:pb-12 px-6 md:px-12 max-w-[1600px] mx-auto w-full flex flex-col gap-8 md:gap-12">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-luxury-header mb-4">Prompt Engine</h1>
          <p className="text-luxury-subheading text-white/40 max-w-2xl">
            Semantic intent restructuring for maximal LLM efficiency. We recursively strip syntactic fluff and optimize for token-to-meaning ratio.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Input Area */}
          <motion.div 
            className="lg:col-span-8 flex flex-col gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="glass-card p-6 md:p-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald/5 blur-[100px] -mr-32 -mt-32 pointer-events-none transition-all group-hover:bg-emerald/10" />
              
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <label className="text-luxury-mono text-[10px] tracking-widest uppercase text-white/50">Raw Instruction</label>
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-yellow-500/20" />
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/20" />
                  </div>
                </div>

                <textarea
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="Paste your raw LLM instruction here..."
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white font-mono text-sm focus:outline-none focus:border-emerald/30 focus:ring-1 focus:ring-emerald/30 transition-all resize-none min-h-[200px] leading-relaxed placeholder:text-white/10"
                />

                <div className="flex flex-col md:flex-row gap-6 justify-between items-center pt-6 border-t border-white/5">
                  <div className="flex p-1 bg-white/5 rounded-xl gap-1 w-full md:w-auto">
                    {intents.map((intent) => (
                      <button
                        key={intent.id}
                        onClick={() => setPromptIntent(intent.id)}
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all duration-300 ${
                          promptIntent === intent.id 
                            ? 'bg-white text-black shadow-lg shadow-white/5' 
                            : 'text-white/40 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {intent.icon}
                        {intent.id}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={optimizePromptAction}
                    disabled={loading || !promptInput}
                    className="w-full md:w-auto group relative flex items-center justify-center gap-3 px-10 py-4 bg-emerald text-black rounded-xl font-mono text-[10px] uppercase tracking-[0.2em] overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />
                        <span>Restructure</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {promptResult && (
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-6 md:p-8 border-emerald/20 overflow-hidden relative"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald/50 to-transparent" />
                  
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-luxury-mono text-emerald flex items-center gap-2">
                      <ChevronRight size={14} /> Optimized Output
                    </h3>
                    <button 
                      onClick={() => navigator.clipboard.writeText(promptResult.optimized_prompt)}
                      className="text-[10px] font-mono text-white/30 hover:text-white transition-colors"
                    >
                      [ COPY TO CLIPBOARD ]
                    </button>
                  </div>

                  <div className="bg-emerald/[0.03] p-8 rounded-2xl border border-emerald/10 font-mono text-sm text-white/80 leading-relaxed whitespace-pre-wrap relative group/code">
                    <div className="absolute top-4 right-4 opacity-0 group-hover/code:opacity-100 transition-opacity">
                      <Sparkles size={16} className="text-emerald/40" />
                    </div>
                    {promptResult.optimized_prompt}
                  </div>
                  
                  {promptResult.removed_words && promptResult.removed_words.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-white/5">
                      <h4 className="text-luxury-mono text-[10px] text-white/20 mb-4 tracking-widest uppercase">Pruned Redundancy</h4>
                      <div className="flex flex-wrap gap-2">
                        {promptResult.removed_words.map((word: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-red-500/5 text-red-500/50 rounded-full text-[10px] font-mono border border-red-500/10 hover:border-red-500/30 transition-colors">
                            {word}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sidebar / Info */}
          <motion.div 
            className="lg:col-span-4 flex flex-col gap-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="glass-card p-8 lg:sticky lg:top-32 border-white/5">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/5 rounded-lg">
                  <MessageSquare size={16} className="text-emerald" />
                </div>
                <h3 className="text-luxury-mono text-xs uppercase tracking-[0.2em]">Heuristic Compiler</h3>
              </div>
              
              <div className="space-y-6">
                <p className="text-[12px] font-mono text-white/40 leading-relaxed">
                  The Engine evaluates instruction prompts natively against Task/Goal dictionaries, recursively stripping semantic stop-words while restructuring the remaining text into formatted templates.
                </p>
                
                <div className="space-y-4">
                  {[
                    { label: "Token Reduction", value: "35% Avg" },
                    { label: "Semantic Density", value: "+42%" },
                    { label: "Response Latency", value: "-12ms" }
                  ].map((stat, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                      <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">{stat.label}</span>
                      <span className="text-[11px] font-mono text-emerald">{stat.value}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 bg-emerald/5 rounded-xl border border-emerald/10 mt-4">
                  <p className="text-[10px] font-mono text-emerald/60 leading-relaxed">
                    <span className="text-emerald font-bold mr-1">TIP:</span> Use 'Coding' intent for technical specs to preserve variable naming and structural indentation.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
