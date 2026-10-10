import { Loader2, Power, ScanSearch } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { formatBytes, formatDuration, formatPercent } from '@/lib/utils/format';
import { useEmbed } from './embedStore';

const BACKEND_LABEL = { gpu: 'GPU', cpu: 'CPU' } as const;

/** 埋め込みモデルの状態（読み込み中・使用中・エラー） */
export function EmbedModelCard() {
  const status = useEmbed((s) => s.status);
  const progress = useEmbed((s) => s.progress);
  const loadingName = useEmbed((s) => s.loadingName);
  const info = useEmbed((s) => s.info);
  const error = useEmbed((s) => s.error);
  const fallbackLog = useEmbed((s) => s.fallbackLog);
  const dimensions = useEmbed((s) => s.dimensions);
  const unload = useEmbed((s) => s.unload);

  if (status === 'loading') {
    const total = progress?.totalBytes ?? 0;
    const ratio = total ? (progress?.loadedBytes ?? 0) / total : undefined;
    const phase = progress?.phase ?? 'runtime';
    return (
      <Card className="animate-fade-in space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin text-accent-600" />
          <span className="truncate font-medium">{loadingName}</span>
        </div>
        <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            {phase === 'reading'
              ? 'モデルを読み込み中'
              : phase === 'initializing'
                ? 'エンジンを初期化中'
                : 'ランタイムを準備中'}
          </span>
          {phase === 'reading' && ratio !== undefined && (
            <span className="font-mono tabular-nums">{formatPercent(ratio)}</span>
          )}
        </div>
        <Progress value={phase === 'reading' ? ratio : undefined} />
      </Card>
    );
  }

  if (status === 'error') {
    return (
      <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <p className="font-medium">埋め込みモデルの読み込みに失敗しました</p>
        <p className="mt-1 break-all whitespace-pre-line">{error}</p>
      </Card>
    );
  }

  if (status !== 'ready' || !info) return null;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          <ScanSearch className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">使用中の埋め込みモデル</div>
          <div className="truncate font-semibold" title={info.name}>
            {info.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatBytes(info.sizeBytes)}</span>
            <span>{BACKEND_LABEL[info.backend]}</span>
            {dimensions && <span>{dimensions} 次元</span>}
            <span>読み込み {formatDuration(info.loadTimeMs)}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void unload()} title="モデルを解放">
          <Power />
          解放
        </Button>
      </div>
      {fallbackLog.length > 0 && (
        <details className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
          <summary className="cursor-pointer font-medium">
            GPU では読み込めなかったため CPU で実行中
          </summary>
          <ul className="mt-2 space-y-1.5">
            {fallbackLog.map((f, i) => (
              <li key={i} className="break-all">
                <span className="font-medium">{BACKEND_LABEL[f.backend]}:</span> {f.message}
              </li>
            ))}
          </ul>
        </details>
      )}
    </Card>
  );
}
