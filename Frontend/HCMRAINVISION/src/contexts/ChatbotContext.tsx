/**
 * ChatbotContext – shares chatbot open/close state across the app
 * so other components (e.g. Legend) can react to the chatbot panel visibility.
 */

import { createContext, useContext, useState, type ReactNode } from 'react';

interface ChatbotContextValue {
  isChatbotOpen: boolean;
  setIsChatbotOpen: (open: boolean) => void;
  toggleChatbot: () => void;
}

const ChatbotContext = createContext<ChatbotContextValue | null>(null);

export function ChatbotProvider({ children }: { children: ReactNode }) {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const toggleChatbot = () => setIsChatbotOpen((prev) => !prev);

  return (
    <ChatbotContext.Provider value={{ isChatbotOpen, setIsChatbotOpen, toggleChatbot }}>
      {children}
    </ChatbotContext.Provider>
  );
}

export function useChatbot(): ChatbotContextValue {
  const ctx = useContext(ChatbotContext);
  if (!ctx) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return ctx;
}
