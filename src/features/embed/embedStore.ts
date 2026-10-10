import { toast } from 'sonner';
import { create } from 'zustand';
import { detectCapabilities } from '@/lib/env/capabilities';
import { llm } from '@/lib/llm/client';
import type {
  EmbedBackend,
  EmbedInput,
  EmbedResult,
  EmbedderInfo,
  LoadProgress,
  ModelSource,
} from '@/lib/llm/types';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from '@/features/settings/settingsStore';

export type EmbedStatus = 'empty' | 'loading' | 'ready' | 'error';

interface EmbedState {
  status: EmbedStatus;
  progress: LoadProgress | null;
  loadingName: string | null;
  info: EmbedderInfo | null;
  error: string | null;
  /** GPU で失敗して CPU に切り替えた場合の理由 */
  fallbackLog: { backend: EmbedBackend; message: string }[];
  /** 埋め込み計算中 */
  busy: boolean;
  /** 埋め込みベクトルの次元数（最初の計算後に分かる） */
  dimensions: number | null;

  load: (source: ModelSource, backend?: EmbedBackend) => Promise<boolean>;
  unload: () => Promise<void>;
  embed: (inputs: EmbedInput[]) => Promise<EmbedResult | null>;
}

export const useEmbed = create<EmbedState>()((set, get) => ({
  status: 'empty',
  progress: null,
  loadingName: null,
  info: null,
  error: null,
  fallbackLog: [],
  busy: false,
  dimensions: null,

  async load(source, backendOverride) {
    if (get().status === 'loading') return false;
    const settings = useSettings.getState();
    const name = source.kind === 'file' ? source.file.name : source.name;
    const hint = settings.backendHints[name];
    const { webgpu } = await detectCapabilities();
    const backend: EmbedBackend = backendOverride ?? (hint === 'cpu' || !webgpu ? 'cpu' : 'gpu');
    const isRetry = backendOverride !== undefined;
    set({
      status: 'loading',
      loadingName: name,
      error: null,
      progress: null,
      info: null,
      dimensions: null,
      fallbackLog: isRetry ? get().fallbackLog : [],
    });

    let pending: LoadProgress | null = null;
    let raf = 0;
    try {
      const info = await llm.loadEmbedder({ source, backend }, (p) => {
        pending = p;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            set({ progress: pending });
          });
        }
      });
      cancelAnimationFrame(raf);
      set({ status: 'ready', info, progress: null, loadingName: null });
      settings.update({
        lastEmbedModelName: info.saved || source.kind === 'stored' ? info.name : null,
        ...(get().fallbackLog.length > 0
          ? { backendHints: { ...settings.backendHints, [info.name]: backend } }
          : {}),
      });
      if (info.saveError) {
        toast.warning('モデルのブラウザ保存に失敗しました', { description: info.saveError });
      }
      toast.success(`${info.name} を読み込みました`, {
        description: backend === 'cpu' ? 'CPU で実行します' : 'GPU で実行します',
      });
      return true;
    } catch (e) {
      cancelAnimationFrame(raf);
      const message = errorMessage(e);
      console.error(e);
      set({ status: 'error', error: message, progress: null, loadingName: null });
      // GPU で読み込めなければ CPU で自動的に再試行する
      if (backend === 'gpu') {
        set((s) => ({ fallbackLog: [...s.fallbackLog, { backend, message }] }));
        toast.info('GPU で読み込めなかったため、CPU で再試行します');
        return get().load(source, 'cpu');
      }
      toast.error('埋め込みモデルの読み込みに失敗しました', { description: message });
      return false;
    }
  },

  async unload() {
    await llm.unloadEmbedder().catch(() => undefined);
    set({ status: 'empty', info: null, progress: null, error: null, dimensions: null });
  },

  async embed(inputs) {
    if (get().status !== 'ready' || inputs.length === 0) return null;
    set({ busy: true });
    try {
      const result = await llm.embed(inputs);
      if (result.vectors[0]) set({ dimensions: result.vectors[0].length });
      return result;
    } catch (e) {
      const message = errorMessage(e);
      console.error(e);
      toast.error('埋め込みの計算に失敗しました', { description: message });
      return null;
    } finally {
      set({ busy: false });
    }
  },
}));
