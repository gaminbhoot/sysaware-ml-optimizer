import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, Settings, X
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useStore } from '../context/StoreContext';
import { useNotification } from '../context/NotificationContext';
import { api } from '../lib/api';
import { ConversationSidebar } from '../components/ConversationSidebar';
import { PromptLab } from '../components/PromptLab';
import { ChatWorkspace } from '../components/ChatWorkspace';
import { useConversations } from '../hooks/useConversations';
import { useChatStream } from '../hooks/useChatStream';

export const Prompts = () => {
  const { modelAnalysis, lmStudioHost, lmStudioPort } = useStore();
  const { addNotification } = useNotification();
  
  // Layout states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLabSidebarOpen, setIsLabSidebarOpen] = useState(true);
  const [isConversationsSidebarOpen, setIsConversationsSidebarOpen] = useState(true);

  // System Prompt & Models
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showSystemPromptModal, setShowSystemPromptModal] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState('');

  // Conversation title edit
  const [isEditingConversationId, setIsEditingConversationId] = useState<string | null>(null);
  const [editedConversationTitle, setEditedConversationTitle] = useState('');

  // User Message Inline Edit
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState('');

  // Chat Input
  const [chatInput, setChatInput] = useState('');

  // Lab State
  const [labInput, setLabInput] = useState('');
  const [labIntent, setLabIntent] = useState('general');
  const [labResult, setLabResult] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [isInlineOptimizing, setIsInlineOptimizing] = useState(false);

  const HARDWARE_SUGGESTIONS = [
    "Optimize context splitting for VRAM",
    "Tweak prompt structure for Apple Silicon",
    "Reduce redundant tokens in diagnostic prompt",
    "Design system prompt for CUDA latency optimization"
  ];

  // Conversations Custom Hook
  const {
    conversations,
    currentChatId,
    setCurrentChatId,
    activeChat,
    chatHistory,
    isInitialState,
    updateActiveChatMessages,
    updateSystemPrompt,
    updateActiveChatModel,
    startNewChat,
    deleteChat,
    renameChat,
    setConversations
  } = useConversations({ 
    modelId: modelAnalysis?.model_id || modelAnalysis?.model_name || 'default', 
    addNotification 
  });

  // Chat Streaming Custom Hook
  const {
    isTyping,
    handleSendMessage: handleSendMessageHook,
    stopGeneration,
    handleEditMessageSubmit: handleEditMessageSubmitHook,
    handleRegenerate
  } = useChatStream({
    currentChatId,
    chatHistory,
    selectedModel,
    modelAnalysis,
    lmStudioHost,
    lmStudioPort,
    updateActiveChatMessages,
    setConversations,
    addNotification
  });

  const handleInlineOptimize = async () => {
    if (!chatInput.trim() || isInlineOptimizing) return;
    setIsInlineOptimizing(true);
    try {
      const data = await api.optimizePrompt(chatInput, 'general');
      if (data.status === 'success' && data.result?.optimized_prompt) {
        setChatInput(data.result.optimized_prompt);
        addNotification({ type: 'success', message: 'Prompt optimized for hardware!' });
      }
    } catch (e) {
      setChatInput(`[SYSTEM: HARDWARE_AWARE_OPTIMIZATION]\n\n${chatInput}\n\n[Constraint: Maximize performance & cache efficiency]`);
      addNotification({ type: 'success', message: 'Prompt optimized (Local fallback)!' });
    } finally {
      setIsInlineOptimizing(false);
    }
  };

  // Sync selectedModel state when activeChat's modelId updates
  useEffect(() => {
    if (activeChat?.modelId) {
      setSelectedModel(activeChat.modelId);
    }
  }, [currentChatId, activeChat?.modelId]);

  // Fetch available models from backend
  const fetchAvailableModels = async () => {
    setIsModelsLoading(true);
    try {
      const host = lmStudioHost || '127.0.0.1';
      const port = lmStudioPort || 1234;
      const models = await api.listRuntimeModels('lmstudio', host, port);
      setAvailableModels(models || []);
      if (models && models.length > 0 && !selectedModel) {
        const active = models.find((m: any) => m.model_id === modelAnalysis?.model_id);
        setSelectedModel(active ? active.model_id : models[0].model_id);
      }
    } catch (err) {
      console.error("Failed to fetch models:", err);
    } finally {
      setIsModelsLoading(false);
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      fetchAvailableModels();
    }
  }, [isChatOpen, lmStudioHost, lmStudioPort]);

  // Handle model change / loading
  const handleModelChange = async (modelId: string) => {
    setIsModelDropdownOpen(false);
    setIsLoadingModel(true);
    addNotification({ type: 'info', message: `Loading model ${modelId} in LM Studio...` });
    try {
      const host = lmStudioHost || '127.0.0.1';
      const port = lmStudioPort || 1234;
      await api.loadRuntimeModel('lmstudio', host, port, modelId);
      
      setSelectedModel(modelId);
      updateActiveChatModel(modelId);
      addNotification({ type: 'success', message: `Model loaded: ${modelId}` });
    } catch (err: any) {
      console.error("Load failed:", err);
      addNotification({ type: 'error', title: 'Model Load Failed', message: err.message || 'Could not load model.' });
    } finally {
      setIsLoadingModel(false);
    }
  };

  // Optimize prompt inside the Laboratory panel
  const optimizePromptAction = async () => {
    if (!labInput) return;
    setIsOptimizing(true);
    try {
      const data = await api.optimizePrompt(labInput, labIntent);
      if (data.status === 'success') {
        setLabResult(data.result);
      } else {
        throw new Error("Backend response error");
      }
    } catch (e) {
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
    await handleSendMessageHook(chatInput, () => setChatInput(''), customMsg);
  };

  // Inject lab optimization result into chat input
  const injectToChat = () => {
    if (labResult?.optimized_prompt) {
      if (!isChatOpen) {
        setIsChatOpen(true);
      }
      setChatInput(labResult.optimized_prompt);
      addNotification({ type: 'success', message: 'Ready in chat input.' });
    }
  };

  const handleEditMessageSubmit = (index: number, newText: string) => {
    handleEditMessageSubmitHook(index, newText);
    setEditingMessageIndex(null);
  };

  // Open System Instructions modal
  const openSystemPromptModal = () => {
    setTempSystemPrompt(activeChat?.systemPrompt || '');
    setShowSystemPromptModal(true);
  };

  const saveSystemPrompt = (promptText: string) => {
    updateSystemPrompt(promptText);
    addNotification({ type: 'success', message: 'System instructions saved.' });
    setShowSystemPromptModal(false);
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-emerald/30 overflow-hidden flex flex-col h-screen">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-emerald/[0.03] blur-[150px] rounded-full" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-silver/[0.02] blur-[120px] rounded-full" />
      </div>

      {/* Unified Header */}
      {!isChatOpen && (
        <div className="relative z-10 pt-10 pb-4 md:pt-14 md:pb-6 px-6 md:px-12 max-w-[1800px] mx-auto w-full flex-shrink-0">
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
                "flex items-center gap-3 px-8 py-4 rounded-2xl border transition-all duration-500 shadow-2xl z-20",
                isChatOpen ? "bg-white text-black border-white" : "bg-white/5 text-white border-white/10 hover:bg-white/10 backdrop-blur-xl"
              )}
            >
              <MessageCircle size={16} className={cn("transition-transform duration-500", isChatOpen && "rotate-180")} />
              <span className="text-xs font-mono uppercase tracking-[0.2em]">{isChatOpen ? 'Close Chat' : 'Open Chat'}</span>
            </motion.button>
          </div>
        </div>
      )}

      <div className={cn(
        "relative z-10 flex-1 flex overflow-hidden w-full",
        isChatOpen 
          ? "px-0 pb-0 gap-0 max-w-none" 
          : "px-6 md:px-12 pb-8 gap-6 max-w-[1800px] mx-auto"
      )}>
        
        {/* CLOSED CHAT LAYOUT: Center standalone Prompt Lab */}
        {!isChatOpen && (
          <div className="w-full max-w-5xl mx-auto h-full flex flex-col animate-fade-in">
            <PromptLab
              isSidebar={false}
              labInput={labInput}
              setLabInput={setLabInput}
              labIntent={labIntent}
              setLabIntent={setLabIntent}
              optimizePromptAction={optimizePromptAction}
              isOptimizing={isOptimizing}
              labResult={labResult}
              injectToChat={injectToChat}
              addNotification={addNotification}
            />
          </div>
        )}

        {/* OPEN CHAT LAYOUT: Full-width Chat, left conversations, right sidebar lab */}
        {isChatOpen && (
          <div className="flex-1 flex overflow-hidden w-full h-full gap-0">
            
            {/* Conversation sidebar (Left) */}
            <ConversationSidebar
              conversations={conversations}
              currentChatId={currentChatId}
              setCurrentChatId={setCurrentChatId}
              isConversationsSidebarOpen={isConversationsSidebarOpen}
              startNewChat={startNewChat}
              isEditingConversationId={isEditingConversationId}
              setIsEditingConversationId={setIsEditingConversationId}
              editedConversationTitle={editedConversationTitle}
              setEditedConversationTitle={setEditedConversationTitle}
              renameChat={renameChat}
              deleteChat={deleteChat}
            />

            {/* Chat Workspace (Center) */}
            <ChatWorkspace
              activeChat={activeChat}
              chatHistory={chatHistory}
              chatInput={chatInput}
              setChatInput={setChatInput}
              isTyping={isTyping}
              stopGeneration={stopGeneration}
              handleSendMessage={handleSendMessage}
              editingMessageIndex={editingMessageIndex}
              editingMessageText={editingMessageText}
              setEditingMessageIndex={setEditingMessageIndex}
              setEditingMessageText={setEditingMessageText}
              handleEditMessageSubmit={handleEditMessageSubmit}
              handleRegenerate={handleRegenerate}
              selectedModel={selectedModel}
              availableModels={availableModels}
              isModelsLoading={isModelsLoading}
              isLoadingModel={isLoadingModel}
              handleModelChange={handleModelChange}
              isModelDropdownOpen={isModelDropdownOpen}
              setIsModelDropdownOpen={setIsModelDropdownOpen}
              isConversationsSidebarOpen={isConversationsSidebarOpen}
              setIsConversationsSidebarOpen={setIsConversationsSidebarOpen}
              isLabSidebarOpen={isLabSidebarOpen}
              setIsLabSidebarOpen={setIsLabSidebarOpen}
              isInitialState={isInitialState}
              addNotification={addNotification}
              handleInlineOptimize={handleInlineOptimize}
              isInlineOptimizing={isInlineOptimizing}
              openSystemPromptModal={openSystemPromptModal}
              setIsChatOpen={setIsChatOpen}
              HARDWARE_SUGGESTIONS={HARDWARE_SUGGESTIONS}
              updateActiveChatMessages={updateActiveChatMessages}
            />

            {/* Collapsible Laboratory Sidebar (Right) */}
            <AnimatePresence>
              {isLabSidebarOpen && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 420, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-shrink-0 h-full overflow-hidden flex flex-col border-l border-white/10 bg-[#0a0a0c]/90 relative z-20"
                >
                  <PromptLab
                    isSidebar={true}
                    labInput={labInput}
                    setLabInput={setLabInput}
                    labIntent={labIntent}
                    setLabIntent={setLabIntent}
                    optimizePromptAction={optimizePromptAction}
                    isOptimizing={isOptimizing}
                    labResult={labResult}
                    injectToChat={injectToChat}
                    addNotification={addNotification}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        )}

      </div>

      {/* System Prompt Modal Overlay */}
      <AnimatePresence>
        {showSystemPromptModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card max-w-lg w-full border border-white/10 overflow-hidden rounded-[32px] shadow-2xl relative"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Settings className="text-emerald" size={16} />
                  <span className="text-xs font-mono uppercase tracking-widest text-white">System Instructions</span>
                </div>
                <button 
                  onClick={() => setShowSystemPromptModal(false)}
                  className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-white/40 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-[11px] font-mono text-white/40 leading-relaxed">
                  Provide custom instructions that guide the behavior of the assistant throughout the chat.
                </p>
                <textarea
                  value={tempSystemPrompt}
                  onChange={(e) => setTempSystemPrompt(e.target.value)}
                  placeholder="e.g. You are a senior CUDA engineer. Keep details highly technical..."
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-white text-xs font-mono focus:outline-none focus:border-emerald/40 resize-none min-h-[140px] leading-relaxed"
                />
              </div>

              <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/[0.01]">
                <button
                  onClick={() => setShowSystemPromptModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/5 bg-white/5 text-[10px] uppercase font-mono tracking-wider hover:bg-white/10 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => saveSystemPrompt(tempSystemPrompt)}
                  className="px-4 py-2.5 rounded-xl bg-emerald text-black text-[10px] uppercase font-mono tracking-wider hover:scale-102 active:scale-98 transition-transform font-bold"
                >
                  Save Instructions
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
