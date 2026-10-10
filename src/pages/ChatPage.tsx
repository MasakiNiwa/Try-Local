import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ChatEmptyState } from '@/features/chat/ChatEmptyState';
import { useChat } from '@/features/chat/chatStore';
import { Composer } from '@/features/chat/Composer';
import { MessageList } from '@/features/chat/MessageList';
import { ModelStatusChip } from '@/features/engine/ModelStatusChip';

export default function ChatPage() {
  const hasMessages = useChat((s) => s.messages.length > 0);
  const clear = useChat((s) => s.clear);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <PageHeader
        title="チャット"
        meta={<ModelStatusChip className="md:hidden" />}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(true)}
            disabled={!hasMessages}
            aria-label="会話をクリア"
            title="会話をクリア"
          >
            <Trash2 />
            <span className="hidden sm:inline">クリア</span>
          </Button>
        }
      />
      {hasMessages ? <MessageList /> : <ChatEmptyState />}
      <Composer />
      <ConfirmDialog
        open={confirming}
        title="会話をクリアしますか？"
        description="現在の会話の履歴をすべて削除します。モデルは読み込まれたままです。"
        confirmLabel="クリア"
        danger
        onConfirm={clear}
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
