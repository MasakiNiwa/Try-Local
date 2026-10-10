import type { PersistStorage, StorageValue } from 'zustand/middleware';

/**
 * localStorage への書き込みを間引く zustand persist 用ストレージ。
 * ストリーミング中の高頻度な更新で毎フレーム JSON 化するのを避ける。
 */
export function createDebouncedStorage<S>(delayMs = 400): PersistStorage<S> {
  const pending = new Map<string, StorageValue<S>>();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const flush = () => {
    timer = undefined;
    for (const [name, value] of pending) {
      try {
        localStorage.setItem(name, JSON.stringify(value));
      } catch (e) {
        console.warn('localStorage への保存に失敗しました', e);
      }
    }
    pending.clear();
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
  }

  return {
    getItem(name) {
      const raw = localStorage.getItem(name);
      return raw ? (JSON.parse(raw) as StorageValue<S>) : null;
    },
    setItem(name, value) {
      pending.set(name, value);
      if (timer === undefined) timer = setTimeout(flush, delayMs);
    },
    removeItem(name) {
      pending.delete(name);
      localStorage.removeItem(name);
    },
  };
}
