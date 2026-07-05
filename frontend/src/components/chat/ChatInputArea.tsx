import { useRef, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, RefreshCcw, ChevronDown, Activity, StopCircle, Send, Command } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ChatInputAreaProps {
  chatInput: string;
  setChatInput: (input: string) => void;
  handleInlineOptimize: () => Promise<void>;
  isInlineOptimizing: boolean;
  handleSendMessage: () => Promise<void>;
  isTyping: boolean;
  stopGeneration: () => void;
  selectedModel: string;
  availableModels: any[];
  isLoadingModel: boolean;
  isModelsLoading: boolean;
  handleModelChange: (modelId: string) => Promise<void>;
  isModelDropdownOpen: boolean;
  setIsModelDropdownOpen: (open: boolean) => void;
}

export const ChatInputArea = memo(({
  chatInput,
  setChatInput,
  handleInlineOptimize,
  isInlineOptimizing,
  handleSendMessage,
  isTyping,
  stopGeneration,
  selectedModel,
  availableModels,
  isLoadingModel,
  isModelsLoading,
  handleModelChange,
  isModelDropdownOpen,
  setIsModelDropdownOpen
}: ChatInputAreaProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize input textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [chatInput]);

  return (
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
  );
});
