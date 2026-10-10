/**
 * モデル読み込みエラーの分類と、ユーザー向けの説明。
 * LiteRT-LM（C++ / Wasm）のエラーメッセージは英語で原因が分かりにくいため、ここで翻訳する。
 */
import { isWebGpuError } from './backend';

export type LoadErrorKind =
  'webgpu' | 'streaming-unsupported' | 'invalid-file' | 'memory' | 'unknown';

export function classifyLoadError(message: string): LoadErrorKind {
  if (isWebGpuError(message)) return 'webgpu';
  if (/streaming .*not supported|unsupported model type for streaming/i.test(message)) {
    return 'streaming-unsupported';
  }
  if (/invalid magic number|not valid flatbuffer|failed to read/i.test(message)) {
    return 'invalid-file';
  }
  if (
    /out of memory|allocation failed|array buffer allocation|cannot enlarge memory|oom/i.test(
      message,
    )
  ) {
    return 'memory';
  }
  return 'unknown';
}

/** Web 向けに変換されたモデル（ファイル名が -web.litertlm）か */
export function isWebModelName(name: string): boolean {
  return /-web\.litertlm$/i.test(name);
}

/** エラーの説明文（原文のメッセージの補足として表示する） */
export function explainLoadError(kind: LoadErrorKind, fileName: string): string | undefined {
  const webHint = isWebModelName(fileName)
    ? ''
    : ' ファイル名が「-web.litertlm」で終わる Web 版のモデルを使ってください。';
  switch (kind) {
    case 'webgpu':
      return 'この端末では WebGPU が使えないようです。CPU で読み込めます。';
    case 'streaming-unsupported':
      return `このモデルファイルは、Web 版 LiteRT-LM がまだ対応していない形式を含んでいます。${webHint}`;
    case 'invalid-file':
      return `LiteRT-LM のモデルファイルではないか、ファイルが壊れている可能性があります。${webHint}`;
    case 'memory':
      return isWebModelName(fileName)
        ? 'メモリが不足しています。他のタブやアプリを閉じるか、より小さいモデル・短い文脈長を試してください。'
        : 'メモリが不足しています。Web 版ではないモデルはファイル全体を一度にメモリへ確保する必要があり、スマホでは容量が足りないことがあります。ファイル名が「-web.litertlm」で終わる Web 版を使ってください（少しずつ読み込むため、この問題は起きません）。';
    default:
      return isWebModelName(fileName) ? undefined : webHint.trim();
  }
}
