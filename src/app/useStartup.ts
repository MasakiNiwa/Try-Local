import { useEffect } from 'react';
import { llm } from '@/lib/llm/client';
import { listStoredModels } from '@/lib/llm/modelStorage';
import { useChat } from '@/features/chat/chatStore';
import { useEngine } from '@/features/engine/engineStore';
import { useSettings } from '@/features/settings/settingsStore';

/**
 * 起動時の処理:
 * - 会話履歴（IndexedDB）の読み込み
 * - 保存済みモデル一覧の取得
 * - 前回のモデルの自動読み込み（設定でオン かつ OPFS に存在する場合）
 * - それ以外はアイドル時に Wasm ランタイムを先読みして初回読み込みを速くする
 */
const idle: (cb: () => void) => void =
  typeof requestIdleCallback === 'function'
    ? (cb) => requestIdleCallback(cb, { timeout: 3000 })
    : (cb) => setTimeout(cb, 1500);

export function useStartup() {
  useEffect(() => {
    let cancelled = false;
    void useChat.getState().init();
    // 最初の応答表示で待たないよう、Markdown レンダラーを先読みしておく
    idle(() => void import('@/features/chat/markdown/Markdown'));
    (async () => {
      const { autoLoadLastModel, lastModelName } = useSettings.getState();
      const stored = await listStoredModels().catch(() => []);
      if (cancelled) return;
      useEngine.setState({ storedModels: stored });
      if (autoLoadLastModel && lastModelName && stored.some((m) => m.name === lastModelName)) {
        void useEngine.getState().load({ kind: 'stored', name: lastModelName });
        return;
      }
      idle(() => {
        if (!cancelled && useEngine.getState().status === 'empty') {
          llm.warmup().catch((e) => console.warn('Wasm の先読みに失敗しました', e));
        }
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);
}
