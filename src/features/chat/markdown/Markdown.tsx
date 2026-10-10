import { memo, useMemo } from 'react';
import ReactMarkdown, { type Components, type Options } from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { splitMarkdownBlocks } from './splitBlocks';

const remarkPlugins: Options['remarkPlugins'] = [remarkGfm];
// 言語指定のあるコードブロックだけハイライトする（自動判定は重いので無効）
const rehypePlugins: Options['rehypePlugins'] = [[rehypeHighlight, { detect: false }]];

const components: Components = {
  a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
};

const Block = memo(function Block({ text }: { text: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {text}
    </ReactMarkdown>
  );
});

/**
 * ブロック単位でメモ化した Markdown レンダラー。
 * 生成中でも変化した末尾ブロックだけを再パースするため、長文でも軽い。
 */
export default function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => splitMarkdownBlocks(text), [text]);
  return (
    <>
      {blocks.map((b, i) => (
        <Block key={i} text={b} />
      ))}
    </>
  );
}
