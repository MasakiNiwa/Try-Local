import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BackendKind, ConversationSettings } from '@/lib/llm/types';

export type ThemeSetting = 'system' | 'light' | 'dark';

/** auto: WebGPU が使えれば GPU（Artisan）、使えなければ CPU */
export type BackendSetting = 'auto' | BackendKind;

export interface Settings extends ConversationSettings {
  // エンジン（変更後はモデルの再読み込みが必要）
  backend: BackendSetting;
  maxNumTokens: number;
  // モデル管理
  saveImportedModels: boolean;
  autoLoadLastModel: boolean;
  lastModelName: string | null;
  /** 画像ページで前回使った埋め込みモデル（ページを開いたときに自動で読み込む） */
  lastEmbedModelName: string | null;
  /** 自動設定時に、フォールバックで読み込めたバックエンドをモデルごとに覚えておく（次回から直接使う） */
  backendHints: Record<string, BackendKind>;
  // 表示・操作
  theme: ThemeSetting;
  enterToSend: boolean;
  showStats: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  systemPrompt: '',
  temperature: 1.0,
  topK: 64,
  topP: 0.95,
  maxOutputTokens: 2048,
  enableThinking: false,

  backend: 'auto',
  maxNumTokens: 4096,

  saveImportedModels: true,
  autoLoadLastModel: true,
  lastModelName: null,
  lastEmbedModelName: null,
  backendHints: {},

  theme: 'system',
  enterToSend: true,
  showStats: true,
};

interface SettingsState extends Settings {
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      update: (patch) => set(patch),
      // 前回のモデル名はリセット対象外（自動読み込みのため）
      reset: () =>
        set((s) => ({
          ...DEFAULT_SETTINGS,
          lastModelName: s.lastModelName,
          lastEmbedModelName: s.lastEmbedModelName,
          backendHints: s.backendHints,
        })),
    }),
    {
      name: 'try-local:settings',
      version: 2,
      migrate: (persisted, version) => {
        const state = persisted as Partial<Settings>;
        // v1 の既定値（GPU 固定）は「自動」に移行する
        if (version < 2 && state.backend === 'gpu-artisan') state.backend = 'auto';
        return state as SettingsState;
      },
      partialize: ({ update: _u, reset: _r, ...rest }) => rest,
    },
  ),
);

export function getConversationSettings(s: Settings): ConversationSettings {
  return {
    systemPrompt: s.systemPrompt,
    temperature: s.temperature,
    topK: s.topK,
    topP: s.topP,
    maxOutputTokens: s.maxOutputTokens,
    enableThinking: s.enableThinking,
  };
}
