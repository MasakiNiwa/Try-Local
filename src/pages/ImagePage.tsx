import { useEffect, useState } from 'react';
import { Boxes, Info } from 'lucide-react';
import { Link } from 'wouter';
import { Card } from '@/components/ui/Card';
import { isEmbeddingModelName } from '@/lib/llm/modelCatalog';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { cn } from '@/lib/utils/cn';
import { ClassifyPanel } from '@/features/embed/ClassifyPanel';
import { EmbedModelCard } from '@/features/embed/EmbedModelCard';
import { useEmbed } from '@/features/embed/embedStore';
import { SearchPanel } from '@/features/embed/SearchPanel';
import { useEngine } from '@/features/engine/engineStore';
import { StoredModelList } from '@/features/models/StoredModelList';
import { useSettings } from '@/features/settings/settingsStore';

type Tab = 'classify' | 'search';

const TABS: { id: Tab; label: string }[] = [
  { id: 'classify', label: '分類' },
  { id: 'search', label: '検索' },
];

/** 埋め込みモデルの準備（保存済みモデルの読み込み。入手・管理はモデル画面） */
function EmbedSetup() {
  const hasStored = useEngine((s) => s.storedModels.some((m) => isEmbeddingModelName(m.name)));
  return (
    <>
      <StoredModelList kind="embedding" />
      <Card className="flex items-center gap-3 p-4 text-sm">
        <p className="min-w-0 flex-1 text-slate-600 dark:text-slate-400">
          {hasStored
            ? 'ほかのモデルの入手・削除はモデル画面で行えます。'
            : '画像を扱うには EmbeddingGemma 2（約 388MB）が必要です。モデル画面から入手してください。'}
        </p>
        <Link
          href="/models"
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-accent-600 px-3 py-2 font-medium text-white hover:bg-accent-700"
        >
          <Boxes className="size-4" />
          モデル画面へ
        </Link>
      </Card>
    </>
  );
}

export default function ImagePage() {
  const status = useEmbed((s) => s.status);
  const load = useEmbed((s) => s.load);
  const storedModels = useEngine((s) => s.storedModels);
  const lastEmbedModelName = useSettings((s) => s.lastEmbedModelName);
  const autoLoad = useSettings((s) => s.autoLoadLastModel);
  const [tab, setTab] = useState<Tab>('classify');

  // 設定で自動読み込みがオンなら、前回の埋め込みモデルをページを開いたときに読み込む
  useEffect(() => {
    if (
      autoLoad &&
      status === 'empty' &&
      lastEmbedModelName &&
      storedModels.some((m) => m.name === lastEmbedModelName)
    ) {
      void load({ kind: 'stored', name: lastEmbedModelName });
    }
    // 初回表示時と保存済み一覧の取得後だけ判定する
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedModels]);

  return (
    <>
      <PageHeader title="画像" />
      <PageBody>
        <div className="flex gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
          <Info className="mt-0.5 size-4 shrink-0" />
          <p>
            EmbeddingGemma 2 で画像と文章を同じ「意味のベクトル」に変換し、分類や検索を行います。
            画像の説明文は作れませんが、軽くて速く、すべて端末内で処理されます。
          </p>
        </div>

        <EmbedModelCard />

        {status === 'ready' ? (
          <>
            <div
              role="tablist"
              aria-label="機能"
              className="grid grid-cols-2 gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-slate-800"
            >
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'rounded-lg py-2 text-sm font-medium transition-colors',
                    tab === t.id
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
                      : 'text-slate-600 dark:text-slate-400',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {/* 両方マウントしたまま切り替え、タブ移動で画像や結果が消えないようにする */}
            <div hidden={tab !== 'classify'}>
              <ClassifyPanel />
            </div>
            <div hidden={tab !== 'search'}>
              <SearchPanel />
            </div>
          </>
        ) : (
          <EmbedSetup />
        )}
      </PageBody>
    </>
  );
}
