/// <reference lib="webworker" />
/**
 * LiteRT-LM の埋め込みエンジン（EmbeddingEngine）。
 * EmbeddingGemma 2 などで、テキストと画像を同じベクトル空間に変換する。
 * Worker 内でのみ使う（engine.worker.ts から公開）。
 */
import { Backend, EmbeddingEngine } from '@litert-lm/core';
import { prepareImage } from './imagePrep';
import { getStoredModelFile, saveModelFile } from './modelStorage';
import { countingStream, ensureRuntime } from './runtime';
import type {
  EmbedInput,
  EmbedResult,
  EmbedderInfo,
  LoadEmbedderRequest,
  LoadProgress,
} from './types';

let embedder: EmbeddingEngine | null = null;
let info: EmbedderInfo | null = null;

const BACKENDS = { gpu: Backend.GPU, cpu: Backend.CPU } as const;

async function toEngineInput(input: EmbedInput) {
  if (input.type === 'text') return input.text;
  return { type: 'image' as const, data: await prepareImage(input.blob) };
}

export const embedderApi = {
  async loadEmbedder(
    wasmBaseUrl: string,
    req: LoadEmbedderRequest,
    onProgress: (p: LoadProgress) => void,
  ): Promise<EmbedderInfo> {
    const started = performance.now();
    onProgress({ phase: 'runtime', loadedBytes: 0, totalBytes: 0 });
    await embedderApi.unloadEmbedder();
    await ensureRuntime(wasmBaseUrl);

    const file =
      req.source.kind === 'file' ? req.source.file : await getStoredModelFile(req.source.name);
    const total = file.size;
    const shouldSave = req.source.kind === 'file' && req.source.save;
    const savePromise: Promise<string | undefined> = shouldSave
      ? saveModelFile(file).then(
          () => undefined,
          (e: unknown) => (e instanceof Error ? e.message : String(e)),
        )
      : Promise.resolve(undefined);

    const stream = countingStream(file.stream(), (n) => {
      onProgress({
        phase: n >= total ? 'initializing' : 'reading',
        loadedBytes: n,
        totalBytes: total,
      });
    });
    const backend = BACKENDS[req.backend];
    embedder = await EmbeddingEngine.create({
      model: stream,
      backend,
      // 画像エンコーダーも同じバックエンドで動かす（未指定だと画像入力が無効になる）
      visionBackend: backend,
    });
    const saveError = await savePromise;
    info = {
      name: file.name,
      sizeBytes: total,
      backend: req.backend,
      loadTimeMs: performance.now() - started,
      saved: shouldSave && !saveError,
      saveError,
    };
    return info;
  },

  async unloadEmbedder(): Promise<void> {
    const e = embedder;
    embedder = null;
    info = null;
    if (e) await e.delete();
  },

  /** 入力ごとにベクトルを計算する（1 件ずつ処理してメモリを抑える） */
  async embed(inputs: EmbedInput[], outputSize?: number): Promise<EmbedResult> {
    if (!embedder) throw new Error('埋め込みモデルが読み込まれていません');
    const started = performance.now();
    const vectors: Float32Array[] = [];
    for (const input of inputs) {
      const res = await embedder.computeEmbedding(await toEngineInput(input), {
        normalize: true,
        outputSize,
      });
      vectors.push(Float32Array.from(res.embedding));
    }
    return { vectors, totalMs: performance.now() - started };
  },
};
