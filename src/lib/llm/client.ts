/**
 * Engine Worker のクライアント（メインスレッド側）。
 * Worker は 1 つだけ起動し、Comlink 経由で呼び出す。
 */
import * as Comlink from 'comlink';
import type { EngineWorkerApi } from './engine.worker';
import type {
  DownloadProgress,
  GenerateEvent,
  GenerateRequest,
  GenerateResult,
  LoadModelRequest,
  LoadProgress,
  LoadedModelInfo,
} from './types';

let worker: Worker | null = null;
let remote: Comlink.Remote<EngineWorkerApi> | null = null;

/** セルフホストしている LiteRT-LM Wasm の絶対 URL */
export function wasmBaseUrl(): string {
  return new URL(`${__LITERTLM_WASM_DIR__}/`, document.baseURI).href;
}

function getRemote(): Comlink.Remote<EngineWorkerApi> {
  if (!remote) {
    worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {
      name: 'litertlm-engine',
    });
    remote = Comlink.wrap<EngineWorkerApi>(worker);
  }
  return remote;
}

export const llm = {
  warmup(): Promise<void> {
    return getRemote().warmup(wasmBaseUrl());
  },

  loadModel(
    req: LoadModelRequest,
    onProgress: (p: LoadProgress) => void,
  ): Promise<LoadedModelInfo> {
    return getRemote().loadModel(wasmBaseUrl(), req, Comlink.proxy(onProgress));
  },

  unloadModel(): Promise<void> {
    return getRemote().unloadModel();
  },

  resetConversation(): Promise<void> {
    return remote ? remote.resetConversation() : Promise.resolve();
  },

  generate(req: GenerateRequest, onEvent: (e: GenerateEvent) => void): Promise<GenerateResult> {
    return getRemote().generate(req, Comlink.proxy(onEvent));
  },

  cancel(): void {
    void remote?.cancel();
  },

  downloadModel(url: string, onProgress: (p: DownloadProgress) => void): Promise<string> {
    return getRemote().downloadModel(url, Comlink.proxy(onProgress));
  },

  cancelDownload(): void {
    void remote?.cancelDownload();
  },

  /**
   * Worker を強制終了して作り直す。
   * GPU のデバイスロストや Wasm のメモリ不足から復帰するための最終手段。
   */
  terminate(): void {
    worker?.terminate();
    worker = null;
    remote = null;
  },
};
