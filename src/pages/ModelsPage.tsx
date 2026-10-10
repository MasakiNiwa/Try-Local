import { Cpu, ExternalLink, Power } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, Section } from '@/components/ui/Card';
import { formatBytes, formatDuration } from '@/lib/utils/format';
import { useEngine } from '@/features/engine/engineStore';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelImport } from '@/features/models/ModelImport';
import { RECOMMENDED_MODELS } from '@/features/models/recommendedModels';
import { StoredModelList } from '@/features/models/StoredModelList';
import { useSettings } from '@/features/settings/settingsStore';
import { BACKEND_LABELS } from '@/features/settings/labels';

function CurrentModel() {
  const status = useEngine((s) => s.status);
  const model = useEngine((s) => s.model);
  const error = useEngine((s) => s.error);
  const unload = useEngine((s) => s.unload);
  const backend = useSettings((s) => s.backend);
  const maxNumTokens = useSettings((s) => s.maxNumTokens);

  if (status === 'error') {
    return (
      <Card className="border-rose-200 p-4 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        <p className="font-medium">読み込みに失敗しました</p>
        <p className="mt-1 break-all">{error}</p>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          WebGPU 非対応の環境では「設定 → バックエンド」を CPU にすると動く場合があります。
        </p>
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
        <CurrentModel />
        <LoadProgressCard />
        <StoredModelList />
        {!loading && <ModelImport />}
        <Section
          title="動作確認済みのモデル"
          description="LiteRT-LM の Web 版は現在、Web 向けに変換されたモデルに対応しています。Hugging Face からダウンロードして取り込んでください。"
        >
          {RECOMMENDED_MODELS.map((m) => (
            <div key={m.file} className="flex items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{m.file}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{m.note}</div>
              </div>
              <a
                href={m.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm text-accent-700 hover:bg-accent-50 dark:text-accent-300 dark:hover:bg-accent-900/20"
              >
                Hugging Face
                <ExternalLink className="size-3.5" />
              </a>
            </div>
          ))}
        </Section>
      </PageBody>
    </>
  );
}
