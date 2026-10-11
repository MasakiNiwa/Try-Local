import type { ReactNode } from 'react';
import { BookOpen, Code2, Cpu, ExternalLink, Info, MonitorCheck, Scale } from 'lucide-react';
import { PageBody, PageHeader } from '@/app/PageHeader';
import { Section } from '@/components/ui/Card';
import { LITERTLM_DOCS_URL, LITERTLM_URL, REPOSITORY_URL } from '@/lib/constants';
import { CapabilityCheck } from '@/features/help/CapabilityCheck';
import { LicenseList } from '@/features/help/LicenseList';

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-accent-700 underline-offset-2 hover:underline dark:text-accent-300"
    >
      {children}
      <ExternalLink className="size-3.5 shrink-0" />
    </a>
  );
}

function Body({ children }: { children: ReactNode }) {
  return <div className="space-y-2 px-4 py-3.5 text-sm leading-relaxed sm:px-5">{children}</div>;
}

const STEPS = [
  {
    title: 'モデルをダウンロード',
    body: '「モデル」画面の「モデルを入手」から、ブラウザで動作が確認されたモデルをダウンロードします。おすすめは公式の Gemma 4 E2B Web 版（約 2GB・WebGPU 専用）です。WebGPU が使えない端末では、CPU でも動く Qwen3 0.6B（約 614MB）を代わりに使えます（遅く、品質も控えめ）。「-web」の付かない Gemma のファイルはスマホ・PC アプリ向けで、ブラウザでは読み込めないことがあります。',
  },
  {
    title: 'モデルを取り込む',
    body: '「モデル」画面でファイルを選択（PC はドラッグ＆ドロップも可）。初回はブラウザ内に保存されるので、次回からは選択不要です。',
  },
  {
    title: 'チャットする',
    body: '読み込みが終わったら「チャット」画面でメッセージを送信。生成中は ■ ボタンで停止できます。',
  },
  {
    title: '画像を扱う（任意）',
    body: '「モデル」画面で EmbeddingGemma 2（約 388MB）を入手し、「画像」画面で読み込むと、画像の分類（ラベルとの類似度）や、文章・画像による画像検索を試せます。画像の説明文は作れません（Gemma 4 の Web 版は現在のところ画像入力に未対応です）。',
  },
  {
    title: 'アプリとして使う（任意）',
    body: 'ブラウザのメニューから「ホーム画面に追加」/「インストール」すると、アプリのように起動できます。一度開けばオフラインでも起動します。',
  },
  {
    title: '設定を調整',
    body: 'Temperature やシステムプロンプト、バックエンド（GPU / CPU）などは「設定」画面で変更できます。',
  },
];

export default function HelpPage() {
  return (
    <>
      <PageHeader title="ヘルプ" />
      <PageBody>
        <Section title="Try Local について" icon={<Info />}>
          <Body>
            <p>
              Try Local は、Google の <ExtLink href={LITERTLM_URL}>LiteRT-LM</ExtLink>{' '}
              をブラウザ上で動かして試すためのテスト用 Web アプリです。他の Web
              アプリにブラウザローカル LLM を組み込むための学習・検証を目的としています。
            </p>
            <p>
              モデルの読み込みから推論まで、すべての処理はこの端末のブラウザ内（Web Worker +
              WebGPU）で行われ、 入力した内容が外部のサーバーに送信されることはありません。
            </p>
          </Body>
        </Section>

        <Section title="使い方" icon={<BookOpen />}>
          <ol className="space-y-3 px-4 py-3.5 sm:px-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-bold text-accent-800 dark:bg-accent-900/50 dark:text-accent-200">
                  {i + 1}
                </span>
                <div className="text-sm">
                  <div className="font-medium">{s.title}</div>
                  <p className="mt-0.5 text-slate-600 dark:text-slate-400">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Body>
            <p className="text-slate-600 dark:text-slate-400">
              推奨環境: WebGPU に対応した最新の Chrome /
              Edge（PC・Android）。モデルサイズに応じた空きメモリが必要です。 詳しくは{' '}
              <ExtLink href={LITERTLM_DOCS_URL}>LiteRT-LM のドキュメント</ExtLink>{' '}
              を参照してください。
            </p>
          </Body>
        </Section>

        <Section
          title="動作環境チェック"
          icon={<MonitorCheck />}
          description="このブラウザの対応状況"
        >
          <CapabilityCheck />
        </Section>

        <Section
          title="WebGPU が使えないとき"
          icon={<Cpu />}
          description="「No GPU adapter found」などのエラーが出る場合"
        >
          <Body>
            <p>
              設定のバックエンドが「自動」なら、WebGPU が使えない端末では{' '}
              <strong>CPU（WebAssembly）</strong>
              で実行します。ただし Gemma 4 の Web 版は WebGPU 専用のため CPU では動きません。CPU
              では Qwen3 0.6B など CPU にも対応したモデルを使ってください。GPU
              で動かしたい場合は、次の点を確認してください。
            </p>
            <ul className="list-disc space-y-1.5 pl-5 text-slate-600 dark:text-slate-400">
              <li>Chrome / Edge を最新版に更新する（Android は Android 12 以降）</li>
              <li>
                アドレスバーに <code className="font-mono text-xs">chrome://gpu</code>{' '}
                と入力し、「WebGPU」の状態を確認する
              </li>
              <li>
                PC では <code className="font-mono text-xs">chrome://settings/system</code>
                の「グラフィック アクセラレーションが使用可能な場合は使用する」をオンにする
              </li>
              <li>
                Android の「高度な保護機能（Advanced Protection）」など、セキュリティ機能によって
                WebGPU や JavaScript の最適化が制限される場合がある
              </li>
              <li>
                GPU がブラウザの非対応リストに入っている端末では、
                <code className="font-mono text-xs">chrome://flags/#enable-unsafe-webgpu</code>
                を有効にすると使えることがある（実験的な機能のため自己責任で）
              </li>
            </ul>
          </Body>
        </Section>

        <Section title="ソースコード" icon={<Code2 />}>
          <Body>
            <p>
              Try Local はオープンソースです。不具合の報告や改善の提案は GitHub
              リポジトリまでお願いします。
            </p>
            <p>
              <ExtLink href={REPOSITORY_URL}>{REPOSITORY_URL.replace('https://', '')}</ExtLink>
            </p>
          </Body>
        </Section>

        <Section title="クレジットとライセンス" icon={<Scale />}>
          <Body>
            <p>
              <strong>Try Local</strong> は{' '}
              <ExtLink href={`${REPOSITORY_URL}/blob/main/LICENSE`}>MIT License</ExtLink>{' '}
              で公開されています。
            </p>
            <p>
              推論エンジンには Google の <strong>LiteRT-LM</strong>（@litert-lm/core, Apache License
              2.0）を利用しています。
              モデルファイルは本アプリには含まれていません。利用するモデルにはそれぞれのライセンス・利用規約
              （例: Gemma の利用規約）が適用されます。
            </p>
            <p className="text-slate-600 dark:text-slate-400">
              以下は本アプリが利用しているオープンソースソフトウェアの一覧です（太字は直接の依存）。
              名前をタップするとライセンス全文を表示します。
            </p>
          </Body>
          <LicenseList />
        </Section>

        <p className="pb-2 text-center text-xs text-slate-400">
          Try Local v{__APP_VERSION__} · LiteRT-LM {__LITERTLM_VERSION__}
        </p>
      </PageBody>
    </>
  );
}
