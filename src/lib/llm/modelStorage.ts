/**
 * OPFS (Origin Private File System) にモデルファイルを保存・管理する。
 * メインスレッドと Worker の両方から利用できる API のみを使う。
 */
import type { StoredModel } from './types';

const DIR_NAME = 'models';

export function isOpfsSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.storage?.getDirectory;
}

async function modelsDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(DIR_NAME, { create: true });
}

export async function listStoredModels(): Promise<StoredModel[]> {
  if (!isOpfsSupported()) return [];
  const dir = await modelsDir();
  const result: StoredModel[] = [];
  // 書き込み途中のファイル（.crswap など）は除外する
  for await (const [name, handle] of dir as unknown as AsyncIterable<[string, FileSystemHandle]>) {
    if (handle.kind !== 'file' || !name.endsWith('.litertlm')) continue;
    const file = await (handle as FileSystemFileHandle).getFile();
    result.push({ name, sizeBytes: file.size, lastModified: file.lastModified });
  }
  return result.sort((a, b) => b.lastModified - a.lastModified);
}

export async function getStoredModelFile(name: string): Promise<File> {
  const dir = await modelsDir();
  const handle = await dir.getFileHandle(name);
  return handle.getFile();
}

export async function deleteStoredModel(name: string): Promise<void> {
  const dir = await modelsDir();
  await dir.removeEntry(name);
}

export async function deleteAllStoredModels(): Promise<void> {
  const root = await navigator.storage.getDirectory();
  await root.removeEntry(DIR_NAME, { recursive: true });
}

/**
 * ストリームを OPFS のファイルに書き込む。失敗・中断時は書きかけのファイルを削除する。
 */
export async function saveModelStream(
  name: string,
  stream: ReadableStream<Uint8Array>,
  onProgress?: (writtenBytes: number) => void,
  signal?: AbortSignal,
): Promise<void> {
  const dir = await modelsDir();
  // 退避されにくくする（ユーザー許可が要る場合もあるので結果は問わない）
  void navigator.storage.persist?.().catch(() => false);

  const handle = await dir.getFileHandle(name, { create: true });
  const writable = await handle.createWritable();
  let written = 0;
  try {
    await stream
      .pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            written += chunk.byteLength;
            onProgress?.(written);
            controller.enqueue(chunk);
          },
        }),
      )
      .pipeTo(writable, { signal });
  } catch (e) {
    // 中途半端なファイルを残さない
    await dir.removeEntry(name).catch(() => undefined);
    throw e;
  }
}

/**
 * File を OPFS にコピーする。同名ファイルがありサイズも一致する場合はスキップする。
 */
export async function saveModelFile(
  file: File,
  onProgress?: (writtenBytes: number) => void,
): Promise<void> {
  const dir = await modelsDir();
  try {
    const existing = await (await dir.getFileHandle(file.name)).getFile();
    if (existing.size === file.size) {
      onProgress?.(file.size);
      return;
    }
  } catch {
    // 未保存
  }
  await saveModelStream(file.name, file.stream(), onProgress);
}
