import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Wand2 } from 'lucide-react';

export const Prompts = () => {
  const [promptInput, setPromptInput] = useState('');
  const [promptIntent, setPromptIntent] = useState('general');
  const [promptResult, setPromptResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

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
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 md:p-24 max-w-[1600px] mx-auto w-full h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mb-16"
      >
        <h1 className="text-luxury-header !text-4xl md:!text-6xl">Prompt Engine</h1>
        <p className="text-luxury-subheading mt-4 text-white/40 !text-base">Semantic intent restructuring</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">
        {/* Main Canvas */}
        <div className="col-span-1 md:col-span-8 flex flex-col gap-8">
          <div className="glass-card p-8 flex flex-col gap-6">
            <div>
              <label className="text-luxury-mono mb-2 block">Raw Instruction</label>
              <textarea
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="Enter prompt to optimize..."
                rows={5}
                className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-mono focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-4 border-t border-white/5">
              <div className="flex gap-2 w-full sm:w-auto">
                {['general', 'coding', 'analysis'].map((intent) => (
                  <button
                    key={intent}
                    onClick={() => setPromptIntent(intent)}
                    className={`px-4 py-2 rounded-lg font-mono text-[10px] uppercase tracking-widest transition-all ${
                      promptIntent === intent ? 'bg-white text-black' : 'bg-white/5 text-white/50 hover:bg-white/10'
                    }`}
                  >
                    {intent}
                  </button>
                ))}
              </div>
              <button
                onClick={optimizePromptAction}
                disabled={loading || !promptInput}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs tracking-widest uppercase transition-all flex items-center justify-center gap-2 border border-white/10"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Wand2 size={14} /> Restructure
                  </>
                )}
              </button>
            </div>
          </div>

          {promptResult && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-8"
            >
              <h3 className="text-luxury-mono mb-6 text-emerald">Optimized Output</h3>
              <div className="bg-black/40 p-6 rounded-xl border border-emerald/20 font-mono text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                {promptResult.optimized_prompt}
              </div>
              
              {promptResult.removed_words && promptResult.removed_words.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-luxury-mono text-[10px] text-white/30 mb-2">Removed Stop-Words</h4>
                  <div className="flex flex-wrap gap-2">
                    {promptResult.removed_words.map((word: string, i: number) => (
                      <span key={i} className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-[10px] font-mono line-through">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Panel (Slide-in / Utility) */}
        <div className="col-span-1 md:col-span-4">
          <div className="glass-card p-8 sticky top-24">
            <h3 className="text-luxury-mono mb-6 flex items-center gap-2">
              <MessageSquare size={14} className="text-white/40" /> Heuristic Compiler
            </h3>
            <p className="text-[11px] font-mono text-white/40 leading-relaxed">
              The Engine evaluates instruction prompts natively against Task/Goal dictionaries, recursively stripping semantic stop-words ("can you please", "I want you to") while restructuring the remaining text into formatted templates for maximal LLM efficiency.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};