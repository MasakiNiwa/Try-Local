# Try Local

**LiteRT-LM をブラウザだけで動かして試す、ローカル LLM チャットのテスト用 Web アプリ**

他の Web アプリにブラウザローカル LLM を組み込むための学習・検証を目的としたプロジェクトです。
Google の [LiteRT-LM](https://github.com/google-ai-edge/LiteRT-LM)（`@litert-lm/core`）を Web Worker + WebGPU で動かし、
Hugging Face からダウンロードした `.litertlm` モデルを取り込んでチャットできます。

🌐 **公開ページ**: https://masakiniwa.github.io/Try-Local/

## 特長

- 🔒 **完全ローカル** — 推論はすべてブラウザ内。入力内容は外部に送信されません
- ⚡ **サクサク動作** — 推論は専用 Web Worker、GPU（WebGPU）で実行。UI スレッドを止めません
- 💾 **モデルの保存・共有** — 取り込んだモデルは OPFS に保存し、次回はファイル選択なしで即読み込み。
  同じ github.io の他のサイトとも共有でき（[共通モデル保存仕様](docs/SHARED_MODEL_STORAGE.md)）、端末へのバックアップにも対応
- ⬇️ **直接ダウンロード** — Hugging Face の URL からブラウザ内に直接ダウンロード
- 🗂️ **会話履歴** — 複数の会話を保存・切り替え。再生成や編集にも対応
- 🖼️ **画像の分類・検索** — EmbeddingGemma 2 で画像と文章をベクトル化（すべて端末内）
- 📱 **スマホ / PC 両対応** — スマホでは下部ナビゲーションバー、PC ではサイドバー
- 📦 **PWA** — ホーム画面に追加でき、一度開けばオフラインでも起動

## 使い方

1. ブラウザで動作が確認されたモデルを用意（アプリの「モデル」画面から直接ダウンロードも可）
   - [gemma-4-E2B-it-web.litertlm](https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm)（約 2GB・公式・WebGPU 専用）← **おすすめ**
   - [gemma-4-E4B-it-web.litertlm](https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm)（約 3GB・公式・WebGPU 専用）
   - [Qwen3-0.6B.litertlm](https://huggingface.co/litert-community/Qwen3-0.6B)（約 614MB・WebGPU が無い端末向けの代替。CPU で動くが遅い）
2. 「モデル」画面でファイルを取り込む（または「モデルを入手」から直接ダウンロード）
3. 「チャット」画面でメッセージを送信

推奨環境: WebGPU に対応した最新の Chrome / Edge（PC・Android）

## 開発

```bash
npm install
npm run dev        # 開発サーバー
npm run build      # 本番ビルド（dist/）
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm test           # Vitest
npm run format     # Prettier
```

`main` ブランチへの push で GitHub Actions が GitHub Pages にデプロイします
（リポジトリの Settings → Pages → Source を **GitHub Actions** にしてください）。

仕様と今後の計画は [docs/SPEC.md](docs/SPEC.md) を参照してください。

## 技術スタック

| 分野          | 採用技術                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------- |
| 推論エンジン  | [@litert-lm/core](https://www.npmjs.com/package/@litert-lm/core)（LiteRT-LM JS API, WebGPU / Wasm） |
| ビルド        | Vite, TypeScript                                                                                    |
| UI            | React, Tailwind CSS, lucide-react, sonner                                                           |
| 状態管理      | Zustand                                                                                             |
| ルーティング  | wouter（ハッシュルーティング）                                                                      |
| Worker 通信   | Comlink                                                                                             |
| Markdown      | react-markdown, remark-gfm, rehype-highlight                                                        |
| テスト / 品質 | Vitest, ESLint, Prettier                                                                            |

## ライセンス

[MIT License](LICENSE)

利用しているサードパーティ製ソフトウェアの一覧は [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)
（ライセンス全文はアプリのヘルプ画面）を参照してください。
モデルファイルは本リポジトリに含まれず、各モデルのライセンス・利用規約が適用されます。
