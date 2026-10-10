import type { GenerationStats } from '@/lib/llm/types';

export type MessageStatus = 'pending' | 'streaming' | 'done' | 'cancelled' | 'error';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  /** 思考（thought チャネル）など本文以外の出力 */
  channels?: Record<string, string>;
  status: MessageStatus;
  error?: string;
  stats?: GenerationStats;
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export type ConversationSummary = Omit<Conversation, 'messages'> & { messageCount: number };
