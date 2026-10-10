import { toast } from 'sonner';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { llm } from '@/lib/llm/client';
import type { ChatTurn, GenerationStats } from '@/lib/llm/types';
import { createDebouncedStorage } from '@/lib/utils/debouncedStorage';
import { errorMessage } from '@/lib/utils/format';
import { createId } from '@/lib/utils/id';
import { getConversationSettings, useSettings } from '@/features/settings/settingsStore';

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

interface ChatState {
  messages: ChatMessage[];
  isGenerating: boolean;
  send: (text: string) => Promise<void>;
  stop: () => void;
  clear: () => void;
}

/** Worker に渡す履歴（エラーになった応答と空の応答は除外する） */
function toHistory(messages: ChatMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of messages) {
    if (m.status === 'error') continue;
    if (m.role === 'assistant' && !m.text) continue;
    turns.push({ id: m.id, role: m.role, text: m.text });
  }
  return turns;
}

export const useChat = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [],
      isGenerating: false,

      async send(text) {
        const trimmed = text.trim();
        if (!trimmed || get().isGenerating) return;

        const history = toHistory(get().messages);
        const user: ChatMessage = {
          id: createId(),
          role: 'user',
          text: trimmed,
          status: 'done',
          createdAt: Date.now(),
        };
        const assistantId = createId();
        const assistant: ChatMessage = {
          id: assistantId,
          role: 'assistant',
          text: '',
          status: 'pending',
          createdAt: Date.now(),
        };
        set((s) => ({ messages: [...s.messages, user, assistant], isGenerating: true }));

        const patchAssistant = (patch: Partial<ChatMessage>) =>
          set((s) => ({
            messages: s.messages.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
          }));

        // トークンはフレーム単位にまとめて描画する（再描画回数を最小化）
        let textBuf = '';
        const channelBuf: Record<string, string> = {};
        let dirty = false;
        let raf = 0;
        const flush = () => {
          raf = 0;
          if (!dirty) return;
          dirty = false;
          patchAssistant({
            text: textBuf,
            channels: Object.keys(channelBuf).length ? { ...channelBuf } : undefined,
            status: 'streaming',
          });
        };

        try {
          const result = await llm.generate(
            {
              settings: getConversationSettings(useSettings.getState()),
              history,
              message: { id: user.id, role: 'user', text: trimmed },
              assistantId,
            },
            (ev) => {
              if (ev.type !== 'delta') return;
              if (ev.channel) channelBuf[ev.channel] = (channelBuf[ev.channel] ?? '') + ev.text;
              else textBuf += ev.text;
              dirty = true;
              if (!raf) raf = requestAnimationFrame(flush);
            },
          );
          cancelAnimationFrame(raf);
          dirty = true;
          flush();
          patchAssistant({ status: result.status, stats: result.stats });
        } catch (e) {
          cancelAnimationFrame(raf);
          const message = errorMessage(e);
          console.error(e);
          patchAssistant({ text: textBuf, status: 'error', error: message });
          toast.error('生成中にエラーが発生しました', { description: message });
        } finally {
          set({ isGenerating: false });
        }
      },

      stop() {
        if (get().isGenerating) llm.cancel();
      },

      clear() {
        if (get().isGenerating) llm.cancel();
        set({ messages: [] });
        void llm.resetConversation();
      },
    }),
    {
      name: 'try-local:chat',
      version: 1,
      storage: createDebouncedStorage<Pick<ChatState, 'messages'>>(),
      // 生成途中のメッセージは保存しない
      partialize: (s) => ({
        messages: s.messages.filter((m) => m.status !== 'pending' && m.status !== 'streaming'),
      }),
    },
  ),
);
