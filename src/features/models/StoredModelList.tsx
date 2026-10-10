import { useEffect, useState } from 'react';
import { HardDrive, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteStoredModel } from '@/lib/llm/modelStorage';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatBytes } from '@/lib/utils/format';
import { useEngine } from '@/features/engine/engineStore';
import {
  isBrowserCompatibleName,
  isEmbeddingModelName,
  type ModelKind,
} from '@/lib/llm/modelCatalog';
import { useEmbed } from '@/features/embed/embedStore';
import { useSettings } from '@/features/settings/settingsStore';

interface StoredModelListProps {
  compact?: boolean;
  /** chat: チャット用モデル、embedding: 埋め込みモデル（画像ページ） */
  kind?: ModelKind;
}

/** OPFS に保存済みのモデル一覧（種類ごとに表示し、それぞれのエンジンで読み込む） */
export function StoredModelList({ compact, kind = 'chat' }: StoredModelListProps) {
  const allModels = useEngine((s) => s.storedModels);
  const refresh = useEngine((s) => s.refreshStoredModels);
  // 進捗などで頻繁に変わる値は購読しない（一覧の再描画を最小限にする）
  const chatStatus = useEngine((s) => s.status);
  const chatCurrent = useEngine((s) => s.model?.name);
  const loadChat = useEngine((s) => s.load);
  const unloadChat = useEngine((s) => s.unload);
  const embedStatus = useEmbed((s) => s.status);
  const embedCurrent = useEmbed((s) => s.info?.name);
  const loadEmbed = useEmbed((s) => s.load);
  const unloadEmbed = useEmbed((s) => s.unload);
  const isEmbedding = kind === 'embedding';
  const models = allModels.filter((m) => isEmbeddingModelName(m.name) === isEmbedding);
  const status = isEmbedding ? embedStatus : chatStatus;
  const current = isEmbedding ? embedCurrent : chatCurrent;
  const load = (name: string) =>
    isEmbedding ? loadEmbed({ kind: 'stored', name }) : loadChat({ kind: 'stored', name });
  const unload = isEmbedding ? unloadEmbed : unloadChat;
  const lastKey = isEmbedding ? 'lastEmbedModelName' : 'lastModelName';
  const lastModelName = useSettings((s) => s[lastKey]);
  const updateSettings = useSettings((s) => s.update);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (models.length === 0) return null;

  const remove = async (name: string) => {
    try {
      if (current === name) await unload();
      await deleteStoredModel(name);
      if (lastModelName === name) updateSettings({ [lastKey]: null });
      toast.success(`${name} を削除しました`);
    } catch (e) {
      toast.error('削除に失敗しました', { description: errorMessage(e) });
    }
    void refresh();
  };

  return (
    <div className="space-y-2">
      {!compact && (
        <h3 className="px-1 text-sm font-medium text-slate-500 dark:text-slate-400">
          保存済みのモデル
        </h3>
      )}
      <ul className="space-y-2">
        {models.map((m) => {
          const active = current === m.name && status === 'ready';
          return (
            <li
              key={m.name}
              className={cn(
                'flex items-center gap-3 rounded-2xl border bg-white p-3 dark:bg-slate-900',
                active
                  ? 'border-accent-400 dark:border-accent-700'
                  : 'border-slate-200 dark:border-slate-800',
              )}
            >
              <HardDrive className="size-5 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" title={m.name}>
                  {m.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {formatBytes(m.sizeBytes)}
                  {active && (
                    <span className="ml-2 text-accent-600 dark:text-accent-400">使用中</span>
                  )}
                  {!isEmbedding && !isBrowserCompatibleName(m.name) && (
                    <span className="ml-2 text-amber-600 dark:text-amber-400">
                      ブラウザ未対応の可能性
                    </span>
                  )}
                </div>
              </div>
              {!active && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={status === 'loading'}
                  onClick={() => void load(m.name)}
                >
                  <Play />
                  読み込む
                </Button>
              )}
              {!compact && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`${m.name} を削除`}
                  title="削除"
                  disabled={status === 'loading'}
                  onClick={() => setDeleting(m.name)}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        title="モデルを削除しますか？"
        description={`${deleting ?? ''} をブラウザの保存領域から削除します。`}
        confirmLabel="削除"
        danger
        onConfirm={() => deleting && void remove(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
