import { apiPost } from './apiClient';

export interface ChatbotMessage {
  role: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

export async function sendChatMessage(message: string): Promise<string> {
  // Leave enough room for a backend cold start plus its bounded AI timeout.
  const res = await apiPost<{ reply: string }>('api/chatbot/message', { message }, { timeout: 60_000 });
  if (!res || typeof res.reply !== 'string' || !res.reply.trim()) {
    throw new Error('Invalid chatbot response');
  }
  return res.reply;
}
