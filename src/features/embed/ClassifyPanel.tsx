import { useEffect, useMemo, useState } from 'react';
import { Loader2, Tags } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { formatDuration } from '@/lib/utils/format';
import { useEmbed } from './embedStore';
import { ImagePickButton } from './ImagePickButton';
import { getCachedVector, setCachedVector } from './labelCache';
import { cosine, softmax } from './similarity';

const STORAGE_KEY = 'try-local:classify';
const DEFAULT_LABELS = ['猫', '犬', '料理', '風景', '人物', '文書', '乗り物', '花'];
const DEFAULT_TEMPLATE = '{label}の写真';

interface SavedState {
  labels: string;
  template: string;
}

function loadSaved(): SavedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SavedState;
  } catch {
    // 読めなければ既定値
  }
  return { labels: DEFAULT_LABELS.join('\n'), template: DEFAULT_TEMPLATE };
}

function parseLabels(text: string): string[] {
  return [
    ...new Set(
      text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    ),
  ].slice(0, 50);
}

interface Result {
  label: string;
  similarity: number;
  probability: number;
}

/** ゼロショット分類: 画像と各ラベル文の類似度を比べる */
export function ClassifyPanel() {
  const embed = useEmbed((s) => s.embed);
  const busy = useEmbed((s) => s.busy);
  const modelName = useEmbed((s) => s.info?.name ?? '');
  const [saved] = useState(loadSaved);
  const [labelsText, setLabelsText] = useState(saved.labels);
  const [template, setTemplate] = useState(saved.template);
  const [image, setImage] = useState<File | null>(null);
  const imageUrl = useMemo(() => (image ? URL.createObjectURL(image) : null), [image]);
  const [results, setResults] = useState<Result[] | null>(null);
  const [elapsed, setElapsed] = useState<number | null>(null);

  useEffect(() => () => void (imageUrl && URL.revokeObjectURL(imageUrl)), [imageUrl]);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ labels: labelsText, template }));
    } catch {
      // 保存できなくても動作には影響しない
    }
  }, [labelsText, template]);

  const labels = parseLabels(labelsText);

  const run = async () => {
    if (!image || labels.length === 0) return;
    const texts = labels.map((l) =>
      template.includes('{label}') ? template.replaceAll('{label}', l) : l,
    );
    const missing = texts.filter((t) => !getCachedVector(modelName, t));
    const res = await embed([
      { type: 'image', blob: image },
      ...missing.map((text) => ({ type: 'text' as const, text })),
    ]);
    if (!res) return;
    const [imageVec, ...textVecs] = res.vectors;
    missing.forEach((t, i) => setCachedVector(modelName, t, textVecs[i]));
    const sims = texts.map((t) => cosine(imageVec, getCachedVector(modelName, t)!));
    const probs = softmax(sims);
    setResults(
      labels
        .map((label, i) => ({ label, similarity: sims[i], probability: probs[i] }))
        .sort((a, b) => b.probability - a.probability),
    );
    setElapsed(res.totalMs);
  };

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="分類する画像"
              className="size-24 shrink-0 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-400 dark:bg-slate-800">
              画像なし
            </div>
          )}
          <div className="space-y-2">
            <ImagePickButton
              variant={image ? 'secondary' : 'primary'}
              onPick={(files) => {
                setImage(files[0]);
                setResults(null);
              }}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              スマホではカメラで撮影することもできます
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="labels" className="block text-sm font-medium">
            ラベル（1 行に 1 つ）
          </label>
          <textarea
            id="labels"
            value={labelsText}
            onChange={(e) => setLabelsText(e.target.value)}
            rows={4}
            className="w-full resize-y rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="template" className="block text-sm font-medium">
            ラベルの文章テンプレート
          </label>
          <input
            id="template"
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {'{label}'}{' '}
            がラベルに置き換わります（例:「猫の写真」）。文章にすると精度が上がることがあります
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full"
          disabled={!image || labels.length === 0 || busy}
          onClick={() => void run()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Tags />}
          {busy ? '計算中…' : '分類する'}
        </Button>
      </Card>

      {results && (
        <Card className="animate-fade-in space-y-3 p-4">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold">結果</h3>
            {elapsed !== null && (
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {formatDuration(elapsed)}
              </span>
            )}
          </div>
          <ul className="space-y-2.5">
            {results.map((r, i) => (
              <li key={r.label} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className={i === 0 ? 'font-semibold' : undefined}>{r.label}</span>
                  <span className="font-mono text-xs text-slate-500 tabular-nums">
                    {(r.probability * 100).toFixed(1)}%（類似度 {r.similarity.toFixed(3)}）
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={
                      i === 0 ? 'h-full bg-accent-500' : 'h-full bg-slate-400 dark:bg-slate-500'
                    }
                    style={{ width: `${Math.max(1, r.probability * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            % は類似度を相対的な確からしさに換算した目安です
          </p>
        </Card>
      )}
    </div>
  );
}
