import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Plus, Check, X, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Conversation } from '../types/chat';

interface ConversationSidebarProps {
  conversations: Conversation[];
  currentChatId: string | null;
  setCurrentChatId: (id: string | null) => void;
  isConversationsSidebarOpen: boolean;
  startNewChat: () => void;
  isEditingConversationId: string | null;
  setIsEditingConversationId: (id: string | null) => void;
  editedConversationTitle: string;
  setEditedConversationTitle: (title: string) => void;
  renameChat: (id: string, title: string) => void;
  deleteChat: (id: string, e: React.MouseEvent) => void;
}

export const ConversationSidebar = ({
  conversations,
  currentChatId,
  setCurrentChatId,
  isConversationsSidebarOpen,
  startNewChat,
  isEditingConversationId,
  setIsEditingConversationId,
  editedConversationTitle,
  setEditedConversationTitle,
  renameChat,
  deleteChat
}: ConversationSidebarProps) => {
  return (
    <AnimatePresence>
      {isConversationsSidebarOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 260, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col border-r border-white/10 h-full bg-[#0a0a0c] overflow-hidden flex-shrink-0 relative z-20"
        >
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Conversations</span>
            <button 
              onClick={startNewChat}
              className="p-1.5 hover:bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-colors"
              title="New Conversation"
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
            {conversations.map((c) => {
              const isActive = c.id === currentChatId;
              return (
                <div
                  key={c.id}
                  onClick={() => setCurrentChatId(c.id)}
                  className={cn(
                    "group flex items-center justify-between px-4 py-2.5 rounded-xl transition-all cursor-pointer",
                    isActive 
                      ? "bg-white/[0.06] text-white" 
                      : "text-white/40 hover:text-white/80 hover:bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden flex-1">
                    <MessageSquare size={14} className="flex-shrink-0" />
                    {isEditingConversationId === c.id ? (
                      <input
                        type="text"
                        value={editedConversationTitle}
                        onChange={(e) => setEditedConversationTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            renameChat(c.id, editedConversationTitle);
                          } else if (e.key === 'Escape') {
                            setIsEditingConversationId(null);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        autoFocus
                        className="bg-black/60 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white font-mono focus:outline-none w-full"
                      />
                    ) : (
                      <span className="text-xs font-mono truncate">{c.title}</span>
                    )}
                  </div>

                  {isEditingConversationId === c.id ? (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          renameChat(c.id, editedConversationTitle);
                        }}
                        className="p-1 text-emerald hover:bg-emerald/10 rounded"
                      >
                        <Check size={12} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingConversationId(null);
                        }}
                        className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditingConversationId(c.id);
                          setEditedConversationTitle(c.title);
                        }}
                        className="p-1 hover:bg-white/10 rounded text-white/40 hover:text-white transition-colors"
                      >
                        <Edit2 size={11} />
                      </button>
                      {conversations.length > 1 && (
                        <button
                          onClick={(e) => deleteChat(c.id, e)}
                          className="p-1 hover:bg-red-500/10 rounded text-red-500/40 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* User Profile Card */}
          <div className="p-5 border-t border-white/10 bg-[#070709] flex items-center gap-3 mt-auto shrink-0">
            <div className="w-9 h-9 rounded-full bg-emerald/10 border border-emerald/20 flex items-center justify-center text-emerald font-mono text-xs font-bold shadow-inner">
              OP
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-mono font-medium text-white/80 truncate">SysAware Operator</span>
              <span className="text-[9px] font-mono text-white/30 uppercase tracking-wider mt-0.5 font-semibold">Local Node</span>
            </div>
          </div>

        </motion.div>
      )}
    </AnimatePresence>
  );
};
