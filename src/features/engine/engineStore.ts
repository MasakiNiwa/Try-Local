import { toast } from 'sonner';
import { create } from 'zustand';
import { llm } from '@/lib/llm/client';
import { listStoredModels } from '@/lib/llm/modelStorage';
import { detectCapabilities } from '@/lib/env/capabilities';
import type {
  BackendKind,
  DownloadProgress,
  LoadProgress,
  LoadedModelInfo,
  ModelSource,
  StoredModel,
} from '@/lib/llm/types';
import { errorMessage } from '@/lib/utils/format';
import { useSettings } from '@/features/settings/settingsStore';
import { isWebGpuError, resolveBackend } from './backend';

export { resolveBackend } from './backend';

export type EngineStatus = 'empty' | 'loading' | 'ready' | 'error';

interface EngineState {
  status: EngineStatus;
  progress: LoadProgress | null;
  /** 読み込み中のモデル名 */
  loadingName: string | null;
  model: LoadedModelInfo | null;
  error: string | null;
  storedModels: StoredModel[];
  /** ダウンロード中の進捗（null: ダウンロードしていない） */
  download: DownloadProgress | null;
  /** WebGPU が使えるか（null: 未判定） */
  webgpu: boolean | null;

  refreshStoredModels: () => Promise<void>;
  detectWebGpu: () => Promise<boolean>;
  /** backend を指定すると設定より優先する */
  load: (source: ModelSource, backend?: BackendKind) => Promise<boolean>;
  unload: () => Promise<void>;
  downloadModel: (url: string) => Promise<void>;
  cancelDownload: () => void;
}

export const useEngine = create<EngineState>()((set, get) => ({
  status: 'empty',
  progress: null,
  loadingName: null,
  model: null,
  error: null,
  storedModels: [],
  download: null,
  webgpu: null,

  async detectWebGpu() {
    const { webgpu } = await detectCapabilities();
    set({ webgpu });
    return webgpu;
  },

  async refreshStoredModels() {
    try {
      set({ storedModels: await listStoredModels() });
    } catch (e) {
      console.warn('OPFS の一覧取得に失敗しました', e);
    }
  },

  async load(source, backendOverride) {
    if (get().status === 'loading') return false;
    const settings = useSettings.getState();
    const name = source.kind === 'file' ? source.file.name : source.name;
    const webgpu = get().webgpu ?? (await get().detectWebGpu());
    const backend = backendOverride ?? resolveBackend(settings.backend, webgpu);
    set({ status: 'loading', loadingName: name, error: null, progress: null, model: null });
    // 進捗通知は高頻度で届くので 1 フレームに 1 回だけ反映する
    let pending: LoadProgress | null = null;
    let raf = 0;
    try {
      const info = await llm.loadModel(
        { source, backend, maxNumTokens: settings.maxNumTokens },
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
      toast.success(`${info.name} を読み込みました`, {
        description: backend === 'cpu' ? 'CPU で実行します（GPU より遅くなります）' : undefined,
      });
      return true;
    } catch (e) {
      cancelAnimationFrame(raf);
      const message = errorMessage(e);
      console.error(e);
      set({ status: 'error', error: message, progress: null, loadingName: null });
      // GPU が原因なら CPU での再試行を提案する（取り込んだファイルはそのまま再利用できる）
      toast.error('モデルの読み込みに失敗しました', {
        description: isWebGpuError(message)
          ? `${message}\nこの端末では WebGPU が使えないようです。CPU で読み込めます。`
          : message,
        duration: isWebGpuError(message) ? 15000 : undefined,
        action:
          backend !== 'cpu' && isWebGpuError(message)
            ? { label: 'CPU で再試行', onClick: () => void get().load(source, 'cpu') }
            : undefined,
      });
      // Wasm / GPU が壊れた状態の可能性があるので Worker を作り直す（ダウンロード中は除く）
      if (!get().download) llm.terminate();
      return false;
    }
  },

  async unload() {
    await llm.unloadModel().catch(() => llm.terminate());
    set({ status: 'empty', model: null, progress: null, error: null });
  },

  async downloadModel(url) {
    if (get().download) return;
    set({ download: { name: '', loadedBytes: 0, totalBytes: 0, bytesPerSec: 0 } });
    let pending: DownloadProgress | null = null;
    let raf = 0;
    try {
      const name = await llm.downloadModel(url, (p) => {
        pending = p;
        if (!raf) {
          raf = requestAnimationFrame(() => {
            raf = 0;
            if (get().download) set({ download: pending });
          });
        }
      });
      cancelAnimationFrame(raf);
      set({ download: null });
      await get().refreshStoredModels();
      toast.success(`${name} をダウンロードしました`);
      // そのまま読み込む
      if (get().status !== 'loading') void get().load({ kind: 'stored', name });
    } catch (e) {
      cancelAnimationFrame(raf);
      set({ download: null });
      const message = errorMessage(e);
      // Comlink 越しだとエラー名が失われることがあるのでメッセージでも判定する
      if ((e instanceof Error && e.name === 'AbortError') || /abort/i.test(message)) {
        toast.info('ダウンロードを中止しました');
      } else {
        console.error(e);
        toast.error('ダウンロードに失敗しました', { description: message });
      }
    }
  },

  cancelDownload() {
    llm.cancelDownload();
  },
}));
