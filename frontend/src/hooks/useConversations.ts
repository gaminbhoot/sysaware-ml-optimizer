import { useState, useEffect, useCallback } from 'react';
import type { Conversation, Message } from '../types';

interface UseConversationsProps {
  modelId: string | null;
  addNotification: (notif: { type: 'success' | 'error' | 'info'; title?: string; message: string }) => void;
}

export function useConversations({ modelId, addNotification }: UseConversationsProps) {
  // Conversations State (localStorage backed)
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('sysaware_prompt_conversations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse conversations:', e);
      }
    }
    return [];
  });

  const [currentChatId, setCurrentChatId] = useState<string | null>(() => {
    return localStorage.getItem('sysaware_prompt_active_chat_id') || null;
  });

  // Initialize a default conversation if list is empty
  useEffect(() => {
    if (conversations.length === 0) {
      const defaultId = Math.random().toString(36).substring(2, 9);
      const newChat: Conversation = {
        id: defaultId,
        title: 'Hardware Optimization Chat',
        messages: [
          { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
        ],
        systemPrompt: 'You are SysAware Assistant, a hardware-aware AI. Provide concise, accurate technical advice.',
        modelId: modelId || 'default',
        createdAt: Date.now()
      };
      setConversations([newChat]);
      setCurrentChatId(defaultId);
    } else if (!currentChatId || !conversations.find(c => c.id === currentChatId)) {
      setCurrentChatId(conversations[0].id);
    }
  }, [conversations.length, currentChatId, modelId]);

  // Persist conversations
  useEffect(() => {
    localStorage.setItem('sysaware_prompt_conversations', JSON.stringify(conversations));
  }, [conversations]);

  // Persist active conversation id
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('sysaware_prompt_active_chat_id', currentChatId);
    } else {
      localStorage.removeItem('sysaware_prompt_active_chat_id');
    }
  }, [currentChatId]);

  // Resolve active conversation
  const activeChat = conversations.find(c => c.id === currentChatId);
  const chatHistory = activeChat ? activeChat.messages : [];
  const isInitialState = chatHistory.length === 0 || (
    chatHistory.length === 1 && 
    chatHistory[0].role === 'assistant' && 
    (chatHistory[0].content.includes('Inference engine established') || chatHistory[0].content.includes('Session reset.'))
  );

  // Helper: Update messages list on active conversation
  const updateActiveChatMessages = useCallback((newMessages: Message[]) => {
    if (!currentChatId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === currentChatId) {
        return { ...c, messages: newMessages };
      }
      return c;
    }));
  }, [currentChatId]);

  // Update system prompt on active conversation
  const updateSystemPrompt = useCallback((promptText: string) => {
    if (!currentChatId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === currentChatId) {
        return { ...c, systemPrompt: promptText };
      }
      return c;
    }));
  }, [currentChatId]);

  // Update selected model on active conversation
  const updateActiveChatModel = useCallback((newModelId: string) => {
    if (!currentChatId) return;
    setConversations(prev => prev.map(c => {
      if (c.id === currentChatId) {
        return { ...c, modelId: newModelId };
      }
      return c;
    }));
  }, [currentChatId]);

  // Conversation Management Helpers
  const startNewChat = useCallback(() => {
    const defaultId = Math.random().toString(36).substring(2, 9);
    const newChat: Conversation = {
      id: defaultId,
      title: `Conversation ${conversations.length + 1}`,
      messages: [
        { role: 'assistant', content: 'Inference engine established. How can I assist with your current hardware configuration?' }
      ],
      systemPrompt: 'You are SysAware Assistant, a hardware-aware AI. Provide concise, accurate technical advice.',
      modelId: modelId || 'default',
      createdAt: Date.now()
    };
    setConversations(prev => [newChat, ...prev]);
    setCurrentChatId(defaultId);
    addNotification({ type: 'info', message: 'New conversation started.' });
  }, [conversations.length, modelId, addNotification]);

  const deleteChat = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (id === currentChatId) {
        if (filtered.length > 0) {
          setCurrentChatId(filtered[0].id);
        } else {
          setCurrentChatId(null);
        }
      }
      return filtered;
    });
    addNotification({ type: 'success', message: 'Conversation deleted.' });
  }, [currentChatId, addNotification]);

  const renameChat = useCallback((id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setConversations(prev => prev.map(c => {
      if (c.id === id) {
        return { ...c, title: newTitle.trim() };
      }
      return c;
    }));
  }, []);

  return {
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
  };
}
