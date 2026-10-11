import { Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { useEngine } from '@/features/engine/engineStore';
import { WebGpuNotice } from '@/features/engine/WebGpuNotice';
import { LoadProgressCard } from '@/features/models/LoadProgressCard';
import { ModelImport } from '@/features/models/ModelImport';
import { StoredModelList } from '@/features/models/StoredModelList';
import { useChat } from './chatStore';

const SUGGESTIONS = [
  '自己紹介をしてください',
  'ブラウザでLLMを動かすメリットを3つ教えて',
  'JavaScriptでFizzBuzzを書いて',
  '「ローカル」をテーマに短い詩を作って',
];

export function ChatEmptyState() {
  const status = useEngine((s) => s.status);
  const send = useChat((s) => s.send);

  if (status === 'ready') {
    return (
      // min-h-0 + スクロール: キーボード表示で高さが減っても入力欄を押し出さない
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center gap-6 px-4 py-8">
          <div className="text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-400 to-indigo-500 text-white shadow-lg">
              <Sparkles className="size-7" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">準備ができました</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              すべての処理はこの端末のブラウザ内で行われます
            </p>
          </div>
          <div className="grid w-full max-w-xl gap-2 sm:grid-cols-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void send(s)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-accent-300 hover:bg-accent-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-accent-800 dark:hover:bg-accent-900/20"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-xl space-y-4 px-4 py-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">ブラウザだけで LLM を動かそう</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            LiteRT-LM の .litertlm モデルを読み込むとチャットできます。
            <Link href="/help" className="text-accent-700 underline dark:text-accent-300">
              使い方
            </Link>
          </p>
        </div>
        <WebGpuNotice />
        <LoadProgressCard />
        {status !== 'loading' && (
          <>
            <StoredModelList compact />
            <ModelImport compact />
          </>
        )}
      </div>
    </div>
  );
}
