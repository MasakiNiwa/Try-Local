import { toast } from 'sonner';
import { create } from 'zustand';
import { llm } from '@/lib/llm/client';
import { listStoredModels } from '@/lib/llm/modelStorage';
import type { LoadProgress, LoadedModelInfo, ModelSource, StoredModel } from '@/lib/llm/types';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from '@/features/settings/settingsStore';

export type EngineStatus = 'empty' | 'loading' | 'ready' | 'error';

interface EngineState {
  status: EngineStatus;
  progress: LoadProgress | null;
  /** 読み込み中のモデル名 */
  loadingName: string | null;
  model: LoadedModelInfo | null;
  error: string | null;
  storedModels: StoredModel[];

  refreshStoredModels: () => Promise<void>;
  load: (source: ModelSource) => Promise<boolean>;
  unload: () => Promise<void>;
}

export const useEngine = create<EngineState>()((set, get) => ({
  status: 'empty',
  progress: null,
  loadingName: null,
  model: null,
  error: null,
  storedModels: [],

  async refreshStoredModels() {
    try {
      set({ storedModels: await listStoredModels() });
    } catch (e) {
      console.warn('OPFS の一覧取得に失敗しました', e);
    }
  },

  async load(source) {
    if (get().status === 'loading') return false;
    const settings = useSettings.getState();
    const name = source.kind === 'file' ? source.file.name : source.name;
    set({ status: 'loading', loadingName: name, error: null, progress: null, model: null });
    // 進捗通知は高頻度で届くので 1 フレームに 1 回だけ反映する
    let pending: LoadProgress | null = null;
    let raf = 0;
    try {
      const info = await llm.loadModel(
        { source, backend: settings.backend, maxNumTokens: settings.maxNumTokens },
        (p) => {
          pending = p;
          if (!raf) {
            raf = requestAnimationFrame(() => {
              raf = 0;
              set({ progress: pending });
            });
          }
        },
      );
      cancelAnimationFrame(raf);
      set({ status: 'ready', model: info, progress: null, loadingName: null });
      settings.update({ lastModelName: info.saved || source.kind === 'stored' ? info.name : null });
      if (info.saveError) {
        toast.warning('モデルのブラウザ保存に失敗しました', { description: info.saveError });
      }
      if (info.saved) void get().refreshStoredModels();
      toast.success(`${info.name} を読み込みました`);
      return true;
    } catch (e) {
      cancelAnimationFrame(raf);
      const message = errorMessage(e);
      console.error(e);
      set({ status: 'error', error: message, progress: null, loadingName: null });
      toast.error('モデルの読み込みに失敗しました', { description: message });
      // Wasm / GPU が壊れた状態の可能性があるので Worker を作り直す
      llm.terminate();
      return false;
    }
  },

  async unload() {
    await llm.unloadModel().catch(() => llm.terminate());
    set({ status: 'empty', model: null, progress: null, error: null });
  },
}));
