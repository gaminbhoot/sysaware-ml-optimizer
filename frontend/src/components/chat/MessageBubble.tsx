import { motion } from 'framer-motion';
import { User, Bot, Copy, RefreshCcw, Edit2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../../lib/utils';
import { ThinkingBlock } from './ThinkingBlock';
import type { Message } from '../../types';

interface MessageBubbleProps {
  msg: Message;
  i: number;
  isUser: boolean;
  parsed: {
    thinking: string;
    content: string;
    isThinking: boolean;
  };
  editingMessageIndex: number | null;
  setEditingMessageIndex: (idx: number | null) => void;
  editingMessageText: string;
  setEditingMessageText: (text: string) => void;
  handleEditMessageSubmit: (idx: number, text: string) => void;
  handleRegenerate: (idx: number) => void;
  addNotification: (n: any) => void;
  chatHistory: Message[];
}

export const MessageBubble = ({
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
}: MessageBubbleProps) => {
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
          {i > 0 && chatHistory[i - 1]?.role === 'user' && (
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
