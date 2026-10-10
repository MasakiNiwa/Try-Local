/**
 * 画像の前処理（Worker / メインスレッドどちらでも動く）。
 * スマホの写真（数 MB・1200 万画素など）をそのまま渡すと Wasm 内のデコードが重いので、
 * 埋め込みに十分な大きさへ縮小して JPEG にする。
 */
const MAX_SIDE = 896;

export async function prepareImage(blob: Blob, maxSide = MAX_SIDE): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('画像を処理できませんでした（2D コンテキストを取得できません）');
    ctx.drawImage(bitmap, 0, 0, width, height);
    return await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.9 });
  } finally {
    bitmap.close();
  }
}
