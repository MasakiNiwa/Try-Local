import { Cpu, Power } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatBytes, formatDuration } from '@/lib/utils/format';
import { resolveBackend, useEngine } from '@/features/engine/engineStore';
import { WebGpuNotice } from '@/features/engine/WebGpuNotice';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelImport } from '@/features/models/ModelImport';
import { ModelDownload } from '@/features/models/ModelDownload';
import { StoredModelList } from '@/features/models/StoredModelList';
import { useSettings } from '@/features/settings/settingsStore';
import { BACKEND_LABELS } from '@/features/settings/labels';

function CurrentModel() {
  const status = useEngine((s) => s.status);
  const model = useEngine((s) => s.model);
  const error = useEngine((s) => s.error);
  const unload = useEngine((s) => s.unload);
  const backendSetting = useSettings((s) => s.backend);
  const webgpu = useEngine((s) => s.webgpu);
  const backend = resolveBackend(backendSetting, webgpu);
  const maxNumTokens = useSettings((s) => s.maxNumTokens);

  if (status === 'error') {
    return (
      <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <p className="font-medium">読み込みに失敗しました</p>
        <p className="mt-1 break-all whitespace-pre-line">{error}</p>
      </Card>
    );
  }
  if (status !== 'ready' || !model) return null;

  const needsReload = model.backend !== backend || model.maxNumTokens !== maxNumTokens;
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <Cpu className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-slate-500 dark:text-slate-400">使用中のモデル</div>
          <div className="truncate font-semibold" title={model.name}>
            {model.name}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{formatBytes(model.sizeBytes)}</span>
            <span>{BACKEND_LABELS[model.backend]}</span>
            <span>文脈長 {model.maxNumTokens}</span>
            <span>読み込み {formatDuration(model.loadTimeMs)}</span>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={() => void unload()} title="モデルを解放">
          <Power />
          解放
        </Button>
      </div>
      {needsReload && (
        <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          エンジン設定が変更されています。反映するにはモデルを読み込み直してください。
        </p>
      )}
    </Card>
  );
}

export default function ModelsPage() {
  const loading = useEngine((s) => s.status === 'loading');
  return (
    <>
      <PageHeader title="モデル" />
      <PageBody>
        <WebGpuNotice />
        <CurrentModel />
        <LoadProgressCard />
        <StoredModelList />
        {!loading && <ModelImport />}
        <ModelDownload />
      </PageBody>
    </>
  );
}
