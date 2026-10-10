/**
 * コードブロックのシンタックスハイライト（rehype プラグイン）。
 *
 * rehype-highlight は highlight.js の「common」37 言語を常に同梱してしまうため、
 * よく使う言語だけを登録した軽量版を用意している。言語は必要に応じて追加する。
 */
import type { Element, Root } from 'hast';
import { toText } from 'hast-util-to-text';
import bash from 'highlight.js/lib/languages/bash';
import c from 'highlight.js/lib/languages/c';
import cpp from 'highlight.js/lib/languages/cpp';
import csharp from 'highlight.js/lib/languages/csharp';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import go from 'highlight.js/lib/languages/go';
import java from 'highlight.js/lib/languages/java';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import kotlin from 'highlight.js/lib/languages/kotlin';
import markdown from 'highlight.js/lib/languages/markdown';
import python from 'highlight.js/lib/languages/python';
import rust from 'highlight.js/lib/languages/rust';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';
import { createLowlight } from 'lowlight';
import { visit } from 'unist-util-visit';

const lowlight = createLowlight({
  bash,
  c,
  cpp,
  csharp,
  css,
  diff,
  go,
  java,
  javascript,
  json,
  kotlin,
  markdown,
  python,
  rust,
  sql,
  typescript,
  xml,
  yaml,
});
lowlight.registerAlias({
  bash: ['sh', 'shell', 'zsh', 'console'],
  javascript: ['js', 'jsx', 'mjs', 'cjs'],
  typescript: ['ts', 'tsx'],
  xml: ['html', 'svg', 'vue'],
  python: ['py'],
  csharp: ['cs'],
  kotlin: ['kt'],
  rust: ['rs'],
  yaml: ['yml'],
  markdown: ['md'],
});

function languageOf(node: Element): string | undefined {
  const classes = node.properties.className;
  if (!Array.isArray(classes)) return undefined;
  for (const cls of classes) {
    const value = String(cls);
    if (value.startsWith('language-')) return value.slice('language-'.length).toLowerCase();
    if (value.startsWith('lang-')) return value.slice('lang-'.length).toLowerCase();
  }
  return undefined;
}

export default function rehypeHighlightLite() {
  return (tree: Root) => {
    visit(tree, 'element', (node, _index, parent) => {
      if (node.tagName !== 'code' || parent?.type !== 'element' || parent.tagName !== 'pre') {
        return;
      }
      const lang = languageOf(node);
      if (!lang || !lowlight.registered(lang)) return;
      const result = lowlight.highlight(lang, toText(node, { whitespace: 'pre' }));
      const classes = Array.isArray(node.properties.className) ? node.properties.className : [];
      node.properties.className = ['hljs', ...classes];
      if (result.children.length > 0) node.children = result.children as Element['children'];
    });
  };
}
