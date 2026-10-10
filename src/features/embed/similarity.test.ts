import { describe, expect, it } from 'vitest';
import { cosine, rankBySimilarity, softmax } from './similarity';

const v = (...xs: number[]) => Float32Array.from(xs);

describe('similarity', () => {
  it('正規化済みベクトルのコサイン類似度', () => {
    expect(cosine(v(1, 0), v(1, 0))).toBeCloseTo(1);
    expect(cosine(v(1, 0), v(0, 1))).toBeCloseTo(0);
  });

  it('softmax は合計 1 で大小関係を保つ', () => {
    const p = softmax([0.3, 0.2, 0.1]);
    expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(p[0]).toBeGreaterThan(p[1]);
    expect(p[1]).toBeGreaterThan(p[2]);
    expect(softmax([])).toEqual([]);
  });

  it('類似度の高い順に並べ、ベクトルの無い項目は除く', () => {
    const items = [
      { id: 'a', vec: v(0, 1) },
      { id: 'b', vec: v(1, 0) },
      { id: 'c', vec: undefined },
    ];
    const ranked = rankBySimilarity(v(1, 0), items, (i) => i.vec);
    expect(ranked.map((r) => r.item.id)).toEqual(['b', 'a']);
  });
});
