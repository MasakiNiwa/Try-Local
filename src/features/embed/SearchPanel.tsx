import { useEffect, useRef, useState } from 'react';
import { Loader2, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import { formatDuration } from '@/lib/utils/format';
import { createId } from '@/lib/utils/id';
import { useEmbed } from './embedStore';
import { ImagePickButton } from './ImagePickButton';
import { rankBySimilarity } from './similarity';

interface GalleryItem {
  id: string;
  name: string;
  url: string;
  file: File;
  vector?: Float32Array;
  failed?: boolean;
}

interface Ranking {
  /** 何で検索したか（表示用） */
  label: string;
  /** 似た画像検索の基準にした画像 */
  baseId?: string;
  scores: Map<string, number>;
  order: string[];
  ms: number;
}

/** 画像をベクトル化して、文章や画像で検索する */
export function SearchPanel() {
  const embed = useEmbed((s) => s.embed);
  const busy = useEmbed((s) => s.busy);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [indexing, setIndexing] = useState<{ done: number; total: number } | null>(null);
  const [query, setQuery] = useState('');
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // ページを離れたらプレビュー用 URL を解放する
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const addFiles = async (files: File[]) => {
    const added = files.map((file) => ({
      id: createId(),
      name: file.name,
      url: URL.createObjectURL(file),
      file,
    }));
    setItems((prev) => [...prev, ...added]);
    setRanking(null);
    // 1 枚ずつ処理して進捗を表示する
    for (let i = 0; i < added.length; i++) {
      setIndexing({ done: i, total: added.length });
      const res = await embed([{ type: 'image', blob: added[i].file }]);
      const vector = res?.vectors[0];
      setItems((prev) =>
        prev.map((it) => (it.id === added[i].id ? { ...it, vector, failed: !vector } : it)),
      );
    }
    setIndexing(null);
  };

  const searchByText = async () => {
    const q = query.trim();
    if (!q) return;
    const res = await embed([{ type: 'text', text: q }]);
    if (!res) return;
    applyRanking(res.vectors[0], `「${q}」`, res.totalMs);
  };

  const searchSimilar = (base: GalleryItem) => {
    if (!base.vector) return;
    applyRanking(base.vector, 'この画像に似たもの', 0, base.id);
  };

  const applyRanking = (vector: Float32Array, label: string, ms: number, baseId?: string) => {
    const ranked = rankBySimilarity(vector, itemsRef.current, (i) => i.vector);
    setRanking({
      label,
      baseId,
      ms,
      scores: new Map(ranked.map((r) => [r.item.id, r.score])),
      order: ranked.map((r) => r.item.id),
    });
  };

  const clear = () => {
    items.forEach((i) => URL.revokeObjectURL(i.url));
    setItems([]);
    setRanking(null);
  };

  const ordered = ranking
    ? [
        ...ranking.order.map((id) => items.find((i) => i.id === id)!).filter(Boolean),
        ...items.filter((i) => !ranking.scores.has(i.id)),
      ]
    : items;
  const indexedCount = items.filter((i) => i.vector).length;

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ImagePickButton
            multiple
            variant="primary"
            disabled={!!indexing}
            onPick={(f) => void addFiles(f)}
          >
            画像を追加
          </ImagePickButton>
          {items.length > 0 && (
            <Button variant="ghost" onClick={clear} disabled={!!indexing}>
              <Trash2 />
              すべて消去
            </Button>
          )}
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {indexing
              ? `ベクトル化中 ${indexing.done + 1} / ${indexing.total}`
              : `${indexedCount} 枚`}
          </span>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void searchByText();
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例: 夕焼けの海、赤い車、猫"
            aria-label="検索する文章"
            className="h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
          />
          <Button
            type="submit"
            variant="primary"
            disabled={!query.trim() || indexedCount === 0 || busy}
          >
            {busy && !indexing ? <Loader2 className="animate-spin" /> : <Search />}
            検索
          </Button>
        </form>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          画像をタップすると、その画像に似た順に並べ替えます
        </p>
      </Card>

      {ranking && (
        <div className="flex items-baseline justify-between px-1 text-sm">
          <span>
            <span className="font-semibold">{ranking.label}</span> に近い順
          </span>
          <button
            type="button"
            className="text-xs text-accent-700 hover:underline dark:text-accent-300"
            onClick={() => setRanking(null)}
          >
            並べ替えを解除
            {ranking.ms > 0 && (
              <span className="ml-2 font-mono text-slate-500">{formatDuration(ranking.ms)}</span>
            )}
          </button>
        </div>
      )}

      {ordered.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {ordered.map((item, index) => {
            const score = ranking?.scores.get(item.id);
            const isBase = ranking?.baseId === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => searchSimilar(item)}
                  disabled={!item.vector || busy}
                  title={item.name}
                  className={cn(
                    'relative block aspect-square w-full overflow-hidden rounded-xl bg-slate-100 ring-2 transition dark:bg-slate-800',
                    isBase
                      ? 'ring-indigo-500'
                      : ranking && index === (ranking.baseId ? 1 : 0)
                        ? 'ring-accent-500'
                        : 'ring-transparent',
                  )}
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  {!item.vector && !item.failed && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Loader2 className="size-5 animate-spin text-white" />
                    </span>
                  )}
                  {item.failed && (
                    <span className="absolute inset-x-0 bottom-0 bg-rose-600/90 px-1 py-0.5 text-[0.65rem] text-white">
                      失敗
                    </span>
                  )}
                  {score !== undefined && (
                    <span className="absolute top-1 left-1 rounded-md bg-black/60 px-1.5 py-0.5 font-mono text-[0.65rem] text-white tabular-nums">
                      {isBase ? '基準' : score.toFixed(3)}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
