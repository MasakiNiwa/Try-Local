import type { Element, Root } from 'hast';
import { describe, expect, it } from 'vitest';
import rehypeHighlightLite from './rehypeHighlightLite';

function codeBlock(lang: string | null, text: string): Root {
  const code: Element = {
    type: 'element',
    tagName: 'code',
    properties: lang ? { className: [`language-${lang}`] } : {},
    children: [{ type: 'text', value: text }],
  };
  return {
    type: 'root',
    children: [{ type: 'element', tagName: 'pre', properties: {}, children: [code] }],
  };
}

function codeOf(tree: Root): Element {
  return (tree.children[0] as Element).children[0] as Element;
}

describe('rehypeHighlightLite', () => {
  it('登録済みの言語（エイリアス含む）をハイライトする', () => {
    const tree = codeBlock('ts', 'const a: number = 1;');
    rehypeHighlightLite()(tree);
    const code = codeOf(tree);
    expect(code.properties.className).toEqual(['hljs', 'language-ts']);
    expect(code.children.some((c) => c.type === 'element')).toBe(true);
  });

  it('未登録の言語・言語指定なしはそのまま', () => {
    for (const lang of ['brainfuck', null]) {
      const tree = codeBlock(lang, '+++');
      rehypeHighlightLite()(tree);
      expect(codeOf(tree).children).toEqual([{ type: 'text', value: '+++' }]);
    }
  });
});
