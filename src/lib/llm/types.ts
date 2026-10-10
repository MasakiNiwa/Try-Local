/**
 * メインスレッド ⇔ Engine Worker 間で受け渡す型。
 * LiteRT-LM 固有の型はできるだけ Worker 内に閉じ込め、UI 側はこの型だけを見る。
 * 将来別のランタイム（WebLLM / Transformers.js など）を追加する場合もこの境界を保つ。
 */

/** 推論バックエンド */
export type BackendKind = 'gpu-artisan' | 'gpu' | 'cpu';

export type ModelSource =
  { kind: 'file'; file: File; save: boolean } | { kind: 'stored'; name: string };

export interface LoadModelRequest {
  source: ModelSource;
  backend: BackendKind;
  maxNumTokens: number;
}

export type LoadPhase = 'runtime' | 'reading' | 'initializing';

export interface LoadProgress {
  phase: LoadPhase;
  loadedBytes: number;
  totalBytes: number;
  /** OPFS への保存を並行している場合の進捗 */
  saveLoadedBytes?: number;
}

export interface LoadedModelInfo {
  name: string;
  sizeBytes: number;
  backend: BackendKind;
  maxNumTokens: number;
  loadTimeMs: number;
  /** 保存に失敗した場合のメッセージ（読み込み自体は成功） */
  saveError?: string;
  saved: boolean;
}

/** 会話（Conversation）単位の設定。変わると Worker 側で会話を作り直す */
export interface ConversationSettings {
  systemPrompt: string;
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  enableThinking: boolean;
}

export interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export interface GenerateRequest {
  settings: ConversationSettings;
  /** 新しいユーザー発話より前の履歴 */
  history: ChatTurn[];
  message: ChatTurn;
  assistantId: string;
}

export type GenerateEvent =
  | { type: 'prefill-start' }
  | { type: 'first-token' }
  | { type: 'delta'; text: string; channel?: string };

export interface GenerationStats {
  totalMs: number;
  ttftMs?: number;
  prefillTokens?: number;
  prefillTokensPerSec?: number;
  decodeTokens?: number;
  decodeTokensPerSec?: number;
  contextTokens?: number;
}

export interface GenerateResult {
  status: 'done' | 'cancelled';
  stats: GenerationStats;
}

export interface StoredModel {
  name: string;
  sizeBytes: number;
  lastModified: number;
}

export interface DownloadProgress {
  name: string;
  loadedBytes: number;
  /** Content-Length が無い場合は 0 */
  totalBytes: number;
  bytesPerSec: number;
}
