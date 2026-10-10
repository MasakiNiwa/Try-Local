import { useState } from 'react';
import { MessageSquare, SquarePen, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Sheet } from '@/components/ui/Sheet';
import { cn } from '@/lib/utils/cn';
import { useChat } from './chatStore';

const dateFormat = new Intl.DateTimeFormat('ja-JP', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface ConversationSheetProps {
  open: boolean;
  onClose: () => void;
}

/** 会話履歴の一覧（切り替え・削除・新規作成） */
export function ConversationSheet({ open, onClose }: ConversationSheetProps) {
  const conversations = useChat((s) => s.conversations);
  const currentId = useChat((s) => s.conversationId);
  const openConversation = useChat((s) => s.openConversation);
  const newConversation = useChat((s) => s.newConversation);
  const deleteConversation = useChat((s) => s.deleteConversation);
  const [deleting, setDeleting] = useState<string | null>(null);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="会話履歴"
      actions={
        <Button
          variant="ghost"
          size="icon"
          aria-label="新しい会話"
          title="新しい会話"
          onClick={() => {
            newConversation();
            onClose();
          }}
        >
          <SquarePen />
        </Button>
      }
    >
      {conversations.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">まだ会話がありません</p>
      ) : (
        <ul className="space-y-0.5 p-2">
          {conversations.map((c) => {
            const active = c.id === currentId;
            return (
              <li key={c.id} className="group relative">
                <button
                  type="button"
                  onClick={() => {
                    void openConversation(c.id);
                    onClose();
                  }}
                  className={cn(
                    'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 pr-12 text-left transition-colors',
                    active
                      ? 'bg-accent-50 dark:bg-accent-900/30'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800',
                  )}
                >
                  <MessageSquare
                    className={cn(
                      'mt-0.5 size-4 shrink-0',
                      active ? 'text-accent-600 dark:text-accent-400' : 'text-slate-400',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{c.title}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      {dateFormat.format(c.updatedAt)} · {c.messageCount} 件
                    </span>
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`「${c.title}」を削除`}
                  title="削除"
                  onClick={() => setDeleting(c.id)}
                  className="absolute top-1/2 right-1 size-9 -translate-y-1/2 opacity-60 group-hover:opacity-100"
                >
                  <Trash2 />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={deleting !== null}
        title="この会話を削除しますか？"
        description="削除した会話は元に戻せません。"
        confirmLabel="削除"
        danger
        onConfirm={() => deleting && void deleteConversation(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Sheet>
  );
}
