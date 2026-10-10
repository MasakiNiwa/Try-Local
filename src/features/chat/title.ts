import type { ChatMessage } from './types';

/** 最初のユーザー発話から会話タイトルを作る */
export function makeTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === 'user')?.text ?? '';
  const oneLine = first.replace(/\s+/g, ' ').trim();
  if (!oneLine) return '新しい会話';
  return oneLine.length > 40 ? `${oneLine.slice(0, 40)}…` : oneLine;
}
