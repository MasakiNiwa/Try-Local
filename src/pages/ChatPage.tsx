import { useState } from 'react';
import { History, SquarePen, Trash2 } from 'lucide-react';
import { PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChatEmptyState } from '@/features/chat/ChatEmptyState';
import { useChat } from '@/features/chat/chatStore';
import { Composer } from '@/features/chat/Composer';
import { ConversationSheet } from '@/features/chat/ConversationSheet';
import { MessageList } from '@/features/chat/MessageList';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';

export default function ChatPage() {
  const ready = useChat((s) => s.ready);
  const hasMessages = useChat((s) => s.messages.length > 0);
  const conversationId = useChat((s) => s.conversationId);
  const clear = useChat((s) => s.clear);
  const newConversation = useChat((s) => s.newConversation);
  const [confirming, setConfirming] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="チャット"
        hideTitleOnMobile
        meta={<ModelStatusChip className="md:hidden" />}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              aria-label="会話履歴"
              title="会話履歴"
            >
              <History />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={newConversation}
              disabled={!hasMessages}
              aria-label="新しい会話"
              title="新しい会話"
            >
              <SquarePen />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirming(true)}
              disabled={!hasMessages}
              aria-label="会話をクリア"
              title="会話をクリア"
              className="max-sm:size-10 max-sm:px-0"
            >
              <Trash2 />
              <span className="hidden sm:inline">クリア</span>
            </Button>
          </>
        }
      />
      {!ready ? (
        <div className="flex-1" />
      ) : hasMessages ? (
        <MessageList key={conversationId} />
      ) : (
        <ChatEmptyState />
      )}
      <Composer />
      <ConversationSheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <ConfirmDialog
        open={confirming}
        title="会話をクリアしますか？"
        description="現在の会話のメッセージをすべて削除します。モデルは読み込まれたままです。"
        confirmLabel="クリア"
        danger
        onConfirm={clear}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
