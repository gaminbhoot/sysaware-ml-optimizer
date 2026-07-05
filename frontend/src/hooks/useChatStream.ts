import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { parseThinkingTags } from '../lib/thinking';
import type { Message, Conversation } from '../types';

interface UseChatStreamProps {
  currentChatId: string | null;
  chatHistory: Message[];
  selectedModel: string;
  modelAnalysis: any;
  lmStudioHost: string;
  lmStudioPort: number;
  updateActiveChatMessages: (newMessages: Message[]) => void;
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  addNotification: (notif: { type: 'success' | 'error' | 'info'; title?: string; message: string }) => void;
}

export function useChatStream({
  currentChatId,
  chatHistory,
  selectedModel,
  modelAnalysis,
  lmStudioHost,
  lmStudioPort,
  updateActiveChatMessages,
  setConversations,
  addNotification
}: UseChatStreamProps) {
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Clean up abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const triggerChatStream = useCallback(async (historyToSend: Message[]) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsTyping(true);

    const requestHistory = [...historyToSend];
    // Find active chat to append system prompt if it exists
    let systemPrompt = '';
    setConversations(prev => {
      const active = prev.find(c => c.id === currentChatId);
      if (active?.systemPrompt) {
        systemPrompt = active.systemPrompt;
      }
      return prev;
    });

    if (systemPrompt) {
      requestHistory.unshift({ role: 'system', content: systemPrompt });
    }

    let assistantMsg: Message = {
      role: 'assistant',
      content: '',
      thinking: '',
      thinkingDuration: 0,
      isThinking: false
    };

    const finalHistory = [...historyToSend, assistantMsg];
    updateActiveChatMessages(finalHistory);

    const startTime = Date.now();
    let hasThinkStarted = false;
    let thinkEndTime = 0;
    let fullContent = '';

    try {
      await api.streamChat(
        requestHistory,
        selectedModel || modelAnalysis?.model_id || modelAnalysis?.model_name || 'default',
        lmStudioHost || '127.0.0.1',
        lmStudioPort || 1234,
        (data) => {
          if (data.content) {
            fullContent += data.content;

            const parsed = parseThinkingTags(fullContent, hasThinkStarted, thinkEndTime);
            hasThinkStarted = parsed.hasThinkStarted;
            thinkEndTime = parsed.thinkEndTime;

            const duration = thinkEndTime
              ? parseFloat(((thinkEndTime - startTime) / 1000).toFixed(1))
              : parseFloat(((Date.now() - startTime) / 1000).toFixed(1));

            assistantMsg = {
              role: 'assistant',
              content: parsed.parsedContent,
              thinking: parsed.parsedThinking,
              isThinking: parsed.isStillThinking,
              thinkingDuration: hasThinkStarted ? duration : undefined
            };

            setConversations(prev => prev.map(c => {
              if (c.id === currentChatId) {
                const msgs = [...c.messages];
                msgs[msgs.length - 1] = assistantMsg;
                return { ...c, messages: msgs };
              }
              return c;
            }));
          } else if (data.error) {
            addNotification({ type: 'error', title: 'Model Error', message: data.error });
          }
        },
        controller.signal
      );
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Stream aborted');
      } else {
        addNotification({ type: 'error', title: 'Connection Failed', message: e.message });
      }
    } finally {
      setIsTyping(false);
      abortControllerRef.current = null;
    }
  }, [currentChatId, selectedModel, modelAnalysis, lmStudioHost, lmStudioPort, updateActiveChatMessages, setConversations, addNotification]);

  const handleSendMessage = useCallback(async (chatInput: string, clearInput: () => void, customMsg?: string) => {
    const text = customMsg || chatInput;
    if (!text.trim() || !currentChatId) return;

    const userMsg: Message = { role: 'user', content: text };
    const updatedHistory = [...chatHistory, userMsg];
    if (!customMsg) {
      clearInput();
    }

    updateActiveChatMessages(updatedHistory);
    await triggerChatStream(updatedHistory);
  }, [currentChatId, chatHistory, updateActiveChatMessages, triggerChatStream]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsTyping(false);
      addNotification({ type: 'info', message: 'Generation stopped.' });
    }
  }, [addNotification]);

  const handleEditMessageSubmit = useCallback((index: number, newText: string) => {
    if (!newText.trim() || !currentChatId) return;
    const truncatedHistory = chatHistory.slice(0, index);
    const updatedUserMsg: Message = { role: 'user', content: newText };
    const finalHistory = [...truncatedHistory, updatedUserMsg];
    updateActiveChatMessages(finalHistory);
    triggerChatStream(finalHistory);
  }, [currentChatId, chatHistory, updateActiveChatMessages, triggerChatStream]);

  const handleRegenerate = useCallback((index: number) => {
    if (!currentChatId) return;
    const prevUserMsgIndex = index - 1;
    if (prevUserMsgIndex < 0 || chatHistory[prevUserMsgIndex].role !== 'user') return;
    const finalHistory = chatHistory.slice(0, prevUserMsgIndex + 1);
    updateActiveChatMessages(finalHistory);
    triggerChatStream(finalHistory);
  }, [currentChatId, chatHistory, updateActiveChatMessages, triggerChatStream]);

  return {
    isTyping,
    triggerChatStream,
    handleSendMessage,
    stopGeneration,
    handleEditMessageSubmit,
    handleRegenerate
  };
}
