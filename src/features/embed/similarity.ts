/**
 * ベクトルの類似度計算（埋め込みは正規化済みなので内積 = コサイン類似度）。
 */
export function cosine(a: Float32Array, b: Float32Array): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

/**
 * 類似度を確率っぽい値に変換する（CLIP などのゼロショット分類と同じ考え方）。
 * scale が大きいほど差が強調される。
 */
export function softmax(values: number[], scale = 50): number[] {
  if (values.length === 0) return [];
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp((v - max) * scale));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

export interface Ranked<T> {
  item: T;
  score: number;
}

/** query との類似度が高い順に並べる */
export function rankBySimilarity<T>(
  query: Float32Array,
  items: T[],
  vectorOf: (item: T) => Float32Array | undefined,
): Ranked<T>[] {
  const ranked: Ranked<T>[] = [];
  for (const item of items) {
    const v = vectorOf(item);
    if (v) ranked.push({ item, score: cosine(query, v) });
  }
  return ranked.sort((a, b) => b.score - a.score);
}
