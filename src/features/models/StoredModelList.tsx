import { useEffect, useState } from 'react';
import { Download, HardDrive, Loader2, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
  isBrowserCompatibleName,
  isEmbeddingModelName,
  type ModelKind,
} from '@/lib/llm/modelCatalog';
import { APP_NAME } from '@/lib/constants';
import { deleteStoredModel, exportStoredModel } from '@/lib/llm/modelStorage';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatBytes, formatPercent } from '@/lib/utils/format';
import { useEmbed } from '@/features/embed/embedStore';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';

interface StoredModelListProps {
  compact?: boolean;
  /** 表示するモデルの種類。all ならチャット用と埋め込み用を並べて表示する */
  kind?: ModelKind | 'all';
}

const KIND_LABEL: Record<ModelKind, string> = { chat: 'チャット', embedding: '画像・埋め込み' };

/** OPFS に保存済みのモデル一覧（種類に応じたエンジンで読み込む） */
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
  const lastModelName = useSettings((s) => s.lastModelName);
  const lastEmbedModelName = useSettings((s) => s.lastEmbedModelName);
  const updateSettings = useSettings((s) => s.update);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [exporting, setExporting] = useState<{ name: string; ratio?: number } | null>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const kindOf = (name: string): ModelKind => (isEmbeddingModelName(name) ? 'embedding' : 'chat');
  const models = allModels
    .filter((m) => kind === 'all' || kindOf(m.name) === kind)
    // all のときはチャット用 → 埋め込み用の順に並べる
    .sort((a, b) => (kindOf(a.name) === kindOf(b.name) ? 0 : kindOf(a.name) === 'chat' ? -1 : 1));
  if (models.length === 0) return null;

  const engineOf = (name: string) =>
    kindOf(name) === 'embedding'
      ? { status: embedStatus, current: embedCurrent, unload: unloadEmbed }
      : { status: chatStatus, current: chatCurrent, unload: unloadChat };

  const load = (name: string) =>
    kindOf(name) === 'embedding'
      ? loadEmbed({ kind: 'stored', name })
      : loadChat({ kind: 'stored', name });

  /** 端末のファイルとして書き出す（ブラウザの外へのバックアップ） */
  const backup = async (name: string) => {
    setExporting({ name });
    try {
      const result = await exportStoredModel(name, (written, total) =>
        setExporting({ name, ratio: total ? written / total : undefined }),
      );
      if (result === 'saved') toast.success(`${name} を書き出しました`);
      if (result === 'downloaded') {
        toast.success('ダウンロードを開始しました', {
          description:
            'ブラウザのダウンロード先（多くの場合「ダウンロード」フォルダ）に保存されます',
        });
      }
    } catch (e) {
      toast.error('書き出しに失敗しました', { description: errorMessage(e) });
    } finally {
      setExporting(null);
    }
  };

  const remove = async (name: string) => {
    try {
      const engine = engineOf(name);
      if (engine.current === name) await engine.unload();
      await deleteStoredModel(name);
      if (lastModelName === name) updateSettings({ lastModelName: null });
      if (lastEmbedModelName === name) updateSettings({ lastEmbedModelName: null });
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
          const modelKind = kindOf(m.name);
          const { status, current } = engineOf(m.name);
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
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
                  {kind === 'all' && (
                    <span
                      className={cn(
                        'rounded px-1.5 py-px text-[0.68rem] font-medium',
                        modelKind === 'embedding'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                          : 'bg-accent-100 text-accent-800 dark:bg-accent-900/40 dark:text-accent-200',
                      )}
                    >
                      {KIND_LABEL[modelKind]}
                    </span>
                  )}
                  <span>{formatBytes(m.sizeBytes)}</span>
                  {active && <span className="text-accent-600 dark:text-accent-400">使用中</span>}
                  {m.savedBy && m.savedBy !== APP_NAME && (
                    <span
                      className="text-slate-500 dark:text-slate-400"
                      title="同じ github.io の別のサイトで保存されたモデル"
                    >
                      {m.savedBy} で保存
                    </span>
                  )}
                  {exporting?.name === m.name && (
                    <span className="inline-flex items-center gap-1 text-accent-600 dark:text-accent-400">
                      <Loader2 className="size-3 animate-spin" />
                      書き出し中
                      {exporting.ratio !== undefined && ` ${formatPercent(exporting.ratio)}`}
                    </span>
                  )}
                  {modelKind === 'chat' && !isBrowserCompatibleName(m.name) && (
                    <span className="text-amber-600 dark:text-amber-400">
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
                  aria-label={`${m.name} を読み込む`}
                  title="読み込む"
                  className={cn(!compact && 'max-sm:size-9 max-sm:px-0')}
                >
                  <Play />
                  <span className={cn(!compact && 'max-sm:hidden')}>読み込む</span>
                </Button>
              )}
              {!compact && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`${m.name} を端末に書き出す`}
                  title="端末に書き出す（バックアップ）"
                  disabled={exporting !== null}
                  onClick={() => void backup(m.name)}
                >
                  <Download />
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
        description={`${deleting ?? ''} をブラウザの保存領域から削除します。同じ github.io の他のサイトからも使えなくなります。`}
        confirmLabel="削除"
        danger
        onConfirm={() => deleting && void remove(deleting)}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
