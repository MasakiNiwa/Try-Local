import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Markdown from './Markdown';

describe('Markdown', () => {
  it('日本語の括弧を含む ** も太字にする', () => {
    const html = renderToStaticMarkup(
      <Markdown text={'WebGPUは、**「ブラウザ上で動く」**ための API です。'} />,
    );
    expect(html).toContain('<strong>「ブラウザ上で動く」</strong>');
  });

  it('コードブロックをハイライトする', () => {
    const html = renderToStaticMarkup(<Markdown text={'```js\nconst a = 1;\n```'} />);
    expect(html).toContain('hljs');
  });
});
