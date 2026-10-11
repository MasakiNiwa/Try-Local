import { toast } from 'sonner';
import { create } from 'zustand';
import { llm } from '@/lib/llm/client';
import type { ChatTurn } from '@/lib/llm/types';
import { errorMessage } from '@/lib/utils/format';
import { createId } from '@/lib/utils/id';
import { getConversationSettings, useSettings } from '@/features/settings/settingsStore';
import { splitThinking } from './thinking';
import { makeTitle } from './title';
import type { ChatMessage, Conversation, ConversationSummary } from './types';

export type { ChatMessage, MessageStatus } from './types';

interface ChatState {
  /** IndexedDB からの読み込みが終わったか */
  ready: boolean;
  conversationId: string;
  createdAt: number;
  messages: ChatMessage[];
  conversations: ConversationSummary[];
  isGenerating: boolean;

  init: () => Promise<void>;
  send: (text: string) => Promise<void>;
  regenerate: () => Promise<void>;
  editAndResend: (messageId: string, text: string) => Promise<void>;
  stop: () => void;
  /** 現在の会話のメッセージを消去する */
  clear: () => void;
  newConversation: () => void;
  openConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  deleteAllConversations: () => Promise<void>;
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

function emptyConversation(): Pick<ChatState, 'conversationId' | 'createdAt' | 'messages'> {
  return { conversationId: createId(), createdAt: Date.now(), messages: [] };
}

let initPromise: Promise<void> | null = null;

/** IndexedDB（Dexie）は初回描画に不要なので遅延読み込みする */
const loadRepo = () => import('./db');

export const useChat = create<ChatState>()((set, get) => {
  /** 現在の会話を保存する（メッセージが無ければ保存しない） */
  const persist = async () => {
    const { conversationId, createdAt, messages } = get();
    if (messages.length === 0) return;
    const conv: Conversation = {
      id: conversationId,
      title: makeTitle(messages),
      createdAt,
      updatedAt: Date.now(),
      messages,
    };
    try {
      const repo = await loadRepo();
      await repo.saveConversation(conv);
      set({ conversations: await repo.listConversations() });
    } catch (e) {
      console.warn('会話の保存に失敗しました', e);
    }
  };

  /**
   * user メッセージ（既に messages に追加済み）に対する応答を生成する。
   * history は user より前のメッセージ。
   */
  const generate = async (history: ChatMessage[], user: ChatMessage) => {
    const conversationId = get().conversationId;
    const assistantId = createId();
    const assistant: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      text: '',
      status: 'pending',
      createdAt: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, assistant], isGenerating: true }));
    void persist();

    const patchAssistant = (patch: Partial<ChatMessage>) => {
      // 生成中に別の会話へ切り替わった場合は反映しない
      if (get().conversationId !== conversationId) return;
      set((s) => ({
        messages: s.messages.map((m) => (m.id === assistantId ? { ...m, ...patch } : m)),
      }));
    };

    // トークンはフレーム単位にまとめて描画する（再描画回数を最小化）
    let textBuf = '';
    const channelBuf: Record<string, string> = {};
    let dirty = false;
    let raf = 0;
    /** 本文に埋め込まれた <think> を思考チャネルに移した表示用の値 */
    const view = () => {
      const { answer, thought } = splitThinking(textBuf);
      const channels = { ...channelBuf };
      if (thought)
        channels.thought = channels.thought ? `${channels.thought}\n${thought}` : thought;
      return { text: answer, channels: Object.keys(channels).length ? channels : undefined };
    };
    const flush = () => {
      raf = 0;
      if (!dirty) return;
      dirty = false;
      patchAssistant({ ...view(), status: 'streaming' });
    };

    try {
      const result = await llm.generate(
        {
          settings: getConversationSettings(useSettings.getState()),
          history: toHistory(history),
          message: { id: user.id, role: 'user', text: user.text },
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
      patchAssistant({ ...view(), status: 'error', error: message });
      toast.error('生成中にエラーが発生しました', { description: message });
    } finally {
      set({ isGenerating: false });
      if (get().conversationId === conversationId) void persist();
    }
  };

  const sendUser = async (history: ChatMessage[], text: string) => {
    const user: ChatMessage = {
      id: createId(),
      role: 'user',
      text,
      status: 'done',
      createdAt: Date.now(),
    };
    set({ messages: [...history, user] });
    await generate(history, user);
  };

  return {
    ready: false,
    ...emptyConversation(),
    conversations: [],
    isGenerating: false,

    init() {
      initPromise ??= (async () => {
        try {
          const repo = await loadRepo();
          await repo.migrateLegacyChat();
          // 起動時は新しい会話で始める（過去の会話は履歴から開ける）
          set({ conversations: await repo.listConversations() });
        } catch (e) {
          console.warn('会話履歴を読み込めませんでした', e);
        }
        set({ ready: true });
      })();
      return initPromise;
    },

    async send(text) {
      const trimmed = text.trim();
      if (!trimmed || get().isGenerating) return;
      await sendUser(get().messages, trimmed);
    },

    async regenerate() {
      const { messages, isGenerating } = get();
      if (isGenerating) return;
      // 最後のユーザー発話以降を捨てて、同じ発話で生成し直す
      let i = messages.length - 1;
      while (i >= 0 && messages[i].role !== 'user') i--;
      if (i < 0) return;
      const user = messages[i];
      const history = messages.slice(0, i);
      set({ messages: [...history, user] });
      await generate(history, user);
    },

    async editAndResend(messageId, text) {
      const trimmed = text.trim();
      const { messages, isGenerating } = get();
      if (!trimmed || isGenerating) return;
      const i = messages.findIndex((m) => m.id === messageId);
      if (i < 0) return;
      await sendUser(messages.slice(0, i), trimmed);
    },

    stop() {
      if (get().isGenerating) llm.cancel();
    },

    clear() {
      if (get().isGenerating) llm.cancel();
      const id = get().conversationId;
      set({ messages: [] });
      void llm.resetConversation();
      void loadRepo().then(async (repo) => {
        await repo.deleteConversation(id);
        set({ conversations: await repo.listConversations() });
      });
    },

    newConversation() {
      if (get().isGenerating) llm.cancel();
      set(emptyConversation());
      void llm.resetConversation();
    },

    async openConversation(id) {
      if (id === get().conversationId) return;
      if (get().isGenerating) llm.cancel();
      const repo = await loadRepo();
      const conv = await repo.getConversation(id);
      if (!conv) {
        toast.error('会話が見つかりませんでした');
        return;
      }
      set({ conversationId: conv.id, createdAt: conv.createdAt, messages: conv.messages });
      // Worker 側は履歴 ID の不一致を検出して自動的に会話を作り直す
    },

    async deleteConversation(id) {
      const repo = await loadRepo();
      await repo.deleteConversation(id);
      if (id === get().conversationId) get().newConversation();
      set({ conversations: await repo.listConversations() });
    },

    async deleteAllConversations() {
      if (get().isGenerating) llm.cancel();
      const repo = await loadRepo();
      await repo.deleteAllConversations();
      set({ ...emptyConversation(), conversations: [] });
      void llm.resetConversation();
    },
  };
});
