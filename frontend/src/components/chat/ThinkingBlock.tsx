import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { TypingIndicator } from '../TypingIndicator';

interface ThinkingBlockProps {
  thinking: string;
  duration?: number;
  isThinking: boolean;
}

export const ThinkingBlock = ({ thinking, duration, isThinking }: ThinkingBlockProps) => {
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
