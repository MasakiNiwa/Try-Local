/**
 * テキスト（ラベル・検索語）の埋め込みのキャッシュ。
 * 同じラベルで何度も分類するときに再計算しない。モデル名をキーに含める。
 */
const cache = new Map<string, Float32Array>();

const keyOf = (model: string, text: string) => `${model}\u0000${text}`;

export function getCachedVector(model: string, text: string): Float32Array | undefined {
  return cache.get(keyOf(model, text));
}

export function setCachedVector(model: string, text: string, vector: Float32Array): void {
  cache.set(keyOf(model, text), vector);
}
