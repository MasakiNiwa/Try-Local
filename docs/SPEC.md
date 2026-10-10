# Try Local 仕様書

## コンセプト

他の Web アプリにブラウザローカル LLM を組み込むために学ぶための、**LiteRT-LM のブラウザ実行テスト用 Web アプリ**。

## 基本方針

- まずはチャット環境をしっかり構築する
- Hugging Face からダウンロードした `.litertlm` ファイルを取り込める
- **サクサク・ヌルヌル**のストレスのない動作を最優先する
- 既存のライブラリを積極的に活用し、将来の拡張性・保守性を重視する
- 作って公開 → 確認 → 改善を小さく繰り返す（PR 単位でフェーズを進める）

## UI / デザイン

- スマホ・PC 両対応（`md` = 768px 未満をスマホレイアウト）
  - スマホ: 画面下部にナビゲーションバー
  - PC: 左サイドバー
- ページ: **チャット** / **モデル** / **設定** / **ヘルプ**
- ライト / ダーク / システム連動テーマ
- アプリヘッダーには GitHub リンクを置かない。GitHub リリース履歴へのリンクはアプリ内のどこにも置かない
- GitHub リポジトリへのリンクはヘルプページにのみ置く

## アーキテクチャ

```
┌──────────── メインスレッド（UI） ────────────┐      ┌──────── Engine Worker（classic） ────────┐
│ React + Zustand                              │      │ @litert-lm/core                          │
│  pages/      チャット・モデル・設定・ヘルプ  │      │  Engine / Conversation                   │
│  features/   chat, engine, models, settings  │ ⇄ ─ │  WebGPU（GPU Artisan）/ CPU              │
│  lib/llm/client.ts ── Comlink ───────────────┼──────┤  OPFS へのモデル保存（並行書き込み）    │
└──────────────────────────────────────────────┘      └──────────────────────────────────────────┘
```

- **推論は専用 Web Worker** で実行し、UI スレッドを常に空ける
  - LiteRT-LM の Wasm ローダーは `importScripts()` を使うため **classic worker**（Vite `worker.format: 'iife'`）
  - Worker 内では Emscripten の `locateFile` を明示して Wasm の URL を解決する
- **GPU / CPU**: 既定は「自動」。WebGPU のアダプタが取れれば `GPU_ARTISAN`（モデルをストリーミング読み込み）、
  取れなければ `CPU`（WebAssembly + XNNPack。モデル全体を Wasm メモリに読み込むため最大 4GB 制約あり）。
  GPU 起因の読み込み失敗時は「CPU で再試行」を提示する。WebGL2 は LiteRT-LM が非対応のため使わない
- **対応モデル**: `src/lib/llm/modelCatalog.ts` で管理。Gemma 4 の Web 版（公式・WebGPU 専用）と
  Qwen3 0.6B（公式サポート外・GPU / CPU 両対応の動作報告あり）。WebGPU 専用モデルは CPU では読み込む前に止める。
  ストリーミング非対応の形式は「通常の GPU 読み込み → CPU」の順に自動で再試行する
- **Wasm ランタイムはセルフホスト**: `@litert-lm/core/wasm/*` をビルド時に `dist/litertlm-wasm/` にコピー（バージョンが npm と常に一致）。
  ブラウザの機能（JSPI / Relaxed SIMD）に応じて最適な Wasm をライブラリが自動選択する
- **モデル保存**: 取り込み時に「エンジンへの読み込み」と「OPFS への保存」を同じ File から並行実行
- **モデルのダウンロード**: Worker で fetch し、レスポンスを OPFS にそのままストリーム書き込み（メモリに溜めない）
- **会話履歴**: IndexedDB（Dexie）に 1 会話 = 1 レコードで保存
- **会話（KV キャッシュ）の再利用**: Worker は現在の Conversation が保持する履歴 ID と設定を記録し、
  一致する場合は既存の Conversation に追記する。設定変更・中断・エラー時は履歴から作り直す
- **描画の最適化**
  - トークンは `requestAnimationFrame` 単位にまとめて状態に反映
  - メッセージは `memo` 化し、生成中の 1 件だけを再描画
  - Markdown は空行区切りのブロック単位でメモ化し、末尾ブロックだけ再パース
  - `content-visibility: auto` で画面外のメッセージの描画を省略
  - チャット以外のページと Markdown レンダラーは遅延読み込み（アイドル時に先読み）
  - コードハイライトはよく使う言語だけを登録した軽量 rehype プラグイン
- **PWA**: vite-plugin-pwa（Workbox）。アプリシェルはプリキャッシュ、Wasm は CacheFirst の実行時キャッシュ。
  モデルのダウンロード（Hugging Face）はキャッシュ対象外（OPFS に保存するため）
  - 会話の保存（IndexedDB）は生成の開始・終了時のみ。Dexie は遅延読み込み

### UI と推論エンジンの境界

`src/lib/llm/types.ts` の型だけを UI が参照し、LiteRT-LM 固有の型は Worker に閉じ込める。
将来ほかのランタイム（WebLLM / Transformers.js など）を比較したくなった場合も、この境界に沿って追加できる。

## ディレクトリ構成

```
src/
  app/          レイアウト・ナビゲーション・起動処理
  pages/        ルート単位のページ
  features/     機能単位（chat / engine / models / settings / help）
  components/ui 汎用 UI 部品
  lib/          llm（Worker・クライアント・型・OPFS）, env, utils
build/          Vite プラグイン（Wasm セルフホスト）
scripts/        ライセンス一覧の生成
```

## ライセンス管理

- アプリ本体: MIT（`LICENSE`）
- サードパーティ: `npm run licenses` が本番依存を再帰的に収集し
  - `THIRD_PARTY_NOTICES.md`（リポジトリで管理。CI で最新か検証）
  - `public/licenses.json`（ビルド時生成。ヘルプページでライセンス全文を表示）
- ライセンス文を同梱していないパッケージ（`@litert-lm/core` など）は `scripts/license-texts/` の標準文を添付

## ロードマップ

### Phase 1: 基盤 + チャット（初期版）

- [x] Vite + React + TypeScript + Tailwind CSS の土台、GitHub Pages 自動デプロイ、CI
- [x] レスポンシブレイアウト（スマホ下部ナビ / PC サイドバー）
- [x] LiteRT-LM を Web Worker で実行（WebGPU / CPU 切替）
- [x] `.litertlm` ファイルの取り込み（ファイル選択・ドラッグ＆ドロップ）、OPFS 保存、起動時自動読み込み
- [x] ストリーミングチャット（Markdown・コードハイライト・停止・コピー・統計表示・思考チャネル表示）
- [x] クリアボタン
- [x] 設定ページ（生成パラメーター・システムプロンプト・エンジン・保存・表示・データ管理）
- [x] ヘルプページ（使い方・動作環境チェック・リポジトリリンク・クレジット/ライセンス全文）

### Phase 2: チャットの充実

- [x] 会話履歴の複数保存（IndexedDB / Dexie）と切り替え・削除・新しい会話（Phase 1 の会話は自動移行）
- [x] 応答の再生成・メッセージの編集して送り直し
- [x] Hugging Face の URL を指定して直接ダウンロード（進捗・速度・残り時間表示、中止、OPFS へ直接ストリーム保存）

### Phase 3: 体験の磨き込み

- [x] PWA 化（ホーム画面に追加、アプリシェルのプリキャッシュ、オフライン起動、更新はユーザーが選択）
- [x] LiteRT-LM の Wasm は実際に使う 1 種類だけを実行時にキャッシュ（パスにバージョンを含めて更新時に混ざらない）
- [x] コードハイライトの言語を絞ってバンドルを軽量化（Markdown チャンク 323KB → 251KB）

### 今後の候補

- [ ] 会話のエクスポート / インポート（JSON・Markdown）
- [ ] 再生成を速くする KV キャッシュのチェックポイント（`Conversation.clone()`）
- [ ] 画像・音声入力（LiteRT-LM Web 版が対応したら）
- [ ] 英語 UI（i18n）
- [ ] ベンチマーク画面（同じプロンプトで設定・バックエンドを比較）
