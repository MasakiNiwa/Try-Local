/**
 * Engine Worker のクライアント（メインスレッド側）。Comlink 経由で呼び出す。
 *
 * チャット用（＋モデルのダウンロード）と埋め込み用で Worker を分ける。
 * LiteRT-LM はストリーミング読み込みした重みをランタイム全体で管理しており
 * （埋め込みエンジンは読み込み後に全体の重みストリームを消去する）、
 * 同じ Wasm ランタイムに 2 つのモデルを載せると互いに壊してしまうため。
 */
import * as Comlink from 'comlink';
import type { EngineWorkerApi } from './engine.worker';
import type {
  DownloadProgress,
  EmbedInput,
  EmbedResult,
  EmbedderInfo,
  LoadEmbedderRequest,
  GenerateEvent,
  GenerateRequest,
  GenerateResult,
  LoadModelRequest,
  LoadProgress,
  LoadedModelInfo,
} from './types';

type Slot = 'chat' | 'embed';

const workers: Partial<Record<Slot, Worker>> = {};
const remotes: Partial<Record<Slot, Comlink.Remote<EngineWorkerApi>>> = {};

/** セルフホストしている LiteRT-LM Wasm の絶対 URL */
export function wasmBaseUrl(): string {
  return new URL(`${__LITERTLM_WASM_DIR__}/`, document.baseURI).href;
}

function getRemote(slot: Slot = 'chat'): Comlink.Remote<EngineWorkerApi> {
  let remote = remotes[slot];
  if (!remote) {
    const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {
      name: `litertlm-${slot}`,
    });
    workers[slot] = worker;
    remote = Comlink.wrap<EngineWorkerApi>(worker);
    remotes[slot] = remote;
  }
  return remote;
}

function terminateSlot(slot: Slot): void {
  workers[slot]?.terminate();
  delete workers[slot];
  delete remotes[slot];
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
    return remotes.chat ? remotes.chat.resetConversation() : Promise.resolve();
  },

  generate(req: GenerateRequest, onEvent: (e: GenerateEvent) => void): Promise<GenerateResult> {
    return getRemote().generate(req, Comlink.proxy(onEvent));
  },

  cancel(): void {
    void remotes.chat?.cancel();
  },

  downloadModel(url: string, onProgress: (p: DownloadProgress) => void): Promise<string> {
    return getRemote().downloadModel(url, Comlink.proxy(onProgress));
  },

  cancelDownload(): void {
    void remotes.chat?.cancelDownload();
  },

  loadEmbedder(
    req: LoadEmbedderRequest,
    onProgress: (p: LoadProgress) => void,
  ): Promise<EmbedderInfo> {
    return getRemote('embed').loadEmbedder(wasmBaseUrl(), req, Comlink.proxy(onProgress));
  },

  unloadEmbedder(): Promise<void> {
    return remotes.embed ? remotes.embed.unloadEmbedder() : Promise.resolve();
  },

  embed(inputs: EmbedInput[], outputSize?: number): Promise<EmbedResult> {
    return getRemote('embed').embed(inputs, outputSize);
  },

  /**
   * チャット用 Worker を強制終了して作り直す。
   * GPU のデバイスロストや Wasm のメモリ不足から復帰するための最終手段。
   */
  terminate(): void {
    terminateSlot('chat');
  },

  /** 埋め込み用 Worker を強制終了して作り直す */
  terminateEmbedder(): void {
    terminateSlot('embed');
  },
};
