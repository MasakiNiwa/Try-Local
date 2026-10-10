import Dexie, { type EntityTable } from 'dexie';
import { makeTitle } from './title';
import type { ChatMessage, Conversation, ConversationSummary } from './types';

/**
 * 会話履歴の永続化（IndexedDB）。
 * 1 会話 = 1 レコード（メッセージを内包）とし、保存は生成の開始・終了時のみ行う。
 */
class TryLocalDb extends Dexie {
  conversations!: EntityTable<Conversation, 'id'>;

  constructor() {
    super('try-local');
    this.version(1).stores({ conversations: 'id, updatedAt' });
  }
}

export const db = new TryLocalDb();

/** 保存してはいけない途中状態のメッセージを確定状態に変換する */
function sanitize(messages: ChatMessage[]): ChatMessage[] {
  return messages.map((m) =>
    m.status === 'pending' || m.status === 'streaming' ? { ...m, status: 'cancelled' } : m,
  );
}

export async function listConversations(): Promise<ConversationSummary[]> {
  const all = await db.conversations.orderBy('updatedAt').reverse().toArray();
  return all.map(({ messages, ...rest }) => ({ ...rest, messageCount: messages.length }));
}

export function getConversation(id: string): Promise<Conversation | undefined> {
  return db.conversations.get(id);
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await db.conversations.put({ ...conv, messages: sanitize(conv.messages) });
}

export async function deleteConversation(id: string): Promise<void> {
  await db.conversations.delete(id);
}

export async function deleteAllConversations(): Promise<void> {
  await db.conversations.clear();
}

const LEGACY_KEY = 'try-local:chat';

/** Phase 1（localStorage 保存）の会話を IndexedDB に移行する */
export async function migrateLegacyChat(): Promise<void> {
  const raw = localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const messages = (JSON.parse(raw)?.state?.messages ?? []) as ChatMessage[];
    if (messages.length > 0) {
      const now = Date.now();
      await saveConversation({
        id: crypto.randomUUID(),
        title: makeTitle(messages),
        createdAt: messages[0]?.createdAt ?? now,
        updatedAt: now,
        messages,
      });
    }
  } catch (e) {
    console.warn('旧形式の会話の移行に失敗しました', e);
  }
  localStorage.removeItem(LEGACY_KEY);
}
