import { useEffect, useState } from 'react';
import { HardDrive, Play, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteStoredModel } from '@/lib/llm/modelStorage';
import { cn } from '@/lib/utils/cn';
import { errorMessage, formatBytes } from '@/lib/utils/format';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';

/** OPFS に保存済みのモデル一覧 */
export function StoredModelList({ compact }: { compact?: boolean }) {
  const models = useEngine((s) => s.storedModels);
  const refresh = useEngine((s) => s.refreshStoredModels);
  const load = useEngine((s) => s.load);
  const unload = useEngine((s) => s.unload);
  const status = useEngine((s) => s.status);
  const current = useEngine((s) => s.model?.name);
  const lastModelName = useSettings((s) => s.lastModelName);
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
      if (lastModelName === name) updateSettings({ lastModelName: null });
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
                </div>
              </div>
              {!active && (
                <Button
                  size="sm"
                  variant="primary"
                  disabled={status === 'loading'}
                  onClick={() => void load({ kind: 'stored', name: m.name })}
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
