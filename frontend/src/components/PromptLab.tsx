import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, MessageSquare, Zap, RefreshCcw, Wand2, Copy, ArrowRight, Activity
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PromptLabProps {
  isSidebar: boolean;
  labInput: string;
  setLabInput: (input: string) => void;
  labIntent: string;
  setLabIntent: (intent: string) => void;
  optimizePromptAction: () => Promise<void>;
  isOptimizing: boolean;
  labResult: any;
  injectToChat: () => void;
  addNotification: (n: any) => void;
}

const Badge = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("px-3 py-1 rounded-full text-[9px] font-mono tracking-widest border uppercase", className)}>
    {children}
  </span>
);

export const PromptLab = ({
  isSidebar,
  labInput,
  setLabInput,
  labIntent,
  setLabIntent,
  optimizePromptAction,
  isOptimizing,
  labResult,
  injectToChat,
  addNotification
}: PromptLabProps) => {
  const intents = [
    { id: 'general', icon: <MessageSquare size={12} /> },
    { id: 'coding', icon: <Zap size={12} /> },
    { id: 'analysis', icon: <Sparkles size={12} /> }
  ];

  return (
    <div className={cn(
      "flex-1 flex flex-col overflow-hidden relative group h-full",
      isSidebar 
        ? "bg-transparent border-0" 
        : "glass-card border border-white/10 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)]"
    )}>
      <div className="absolute inset-0 bg-gradient-to-b from-emerald/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
      
      {/* Lab Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.01]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald/10 rounded-lg text-emerald">
            <Sparkles size={16} />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-white">Prompt Enhancer</span>
        </div>
        {!isSidebar && (
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
              "w-full bg-black/40 border border-white/10 rounded-2xl p-5 text-white font-mono transition-all resize-none leading-relaxed placeholder:text-white/10 focus:outline-none focus:border-emerald/30 focus:ring-1 focus:ring-emerald/20 shadow-inner",
              isSidebar ? "h-32 text-xs" : "h-72 text-base"
            )}
          />
          
          <div className="grid grid-cols-3 gap-3">
            {intents.map((intent) => (
              <button
                key={intent.id}
                onClick={() => setLabIntent(intent.id)}
                className={cn(
                  "flex items-center justify-center gap-3 py-3 rounded-xl font-mono text-[10px] uppercase tracking-widest transition-all border",
                  labIntent === intent.id ? 'bg-white text-black border-white shadow-xl' : 'bg-white/5 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
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
            className="w-full group relative flex items-center justify-center gap-4 py-4 bg-white text-black rounded-xl font-mono text-xs uppercase tracking-[0.3em] transition-all hover:shadow-[0_0_40px_rgba(255,255,255,0.1)] disabled:opacity-50"
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
              className="space-y-6 pt-8 border-t border-white/10"
            >
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-mono uppercase tracking-widest text-emerald/50">Restructured Intelligence</label>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(labResult.optimized_prompt);
                    addNotification({ type: 'success', message: 'Copied!' });
                  }}
                  className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-white/40 hover:text-white transition-all border border-white/10"
                >
                  <Copy size={14} />
                </button>
              </div>

              <div className={cn(
                "bg-emerald/[0.02] p-6 rounded-2xl border border-emerald/10 font-mono leading-relaxed whitespace-pre-wrap text-white/80 shadow-2xl relative overflow-hidden",
                isSidebar ? "text-xs p-5" : "text-sm"
              )}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald/5 blur-3xl pointer-events-none" />
                {labResult.optimized_prompt}
              </div>

              <button
                onClick={injectToChat}
                className="w-full flex items-center justify-center gap-4 py-4 bg-emerald text-black rounded-xl font-mono text-[10px] uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] group/btn"
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
