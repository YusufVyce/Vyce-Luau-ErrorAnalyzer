/**
 * Turns a picked file into a small upload: cropped from the middle to the
 * target shape, scaled down and saved as WebP (JPEG where the browser can't
 * write WebP), getting smaller until it fits the size limit.
 */
import { IMAGE_SPECS, type ImageKind } from "./shared";

async function load(file: Blob): Promise<CanvasImageSource & { width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // fall back to an <img> (older Safari)
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** base64 of the resized image, or null when the file can't be read as an image. */
export async function resizeForUpload(file: Blob, kind: ImageKind): Promise<string | null> {
  const { width, height, maxBytes } = IMAGE_SPECS[kind];
  let src;
  try {
    src = await load(file);
  } catch {
    return null;
  }
  if (!src.width || !src.height) return null;
  // Cover: crop the middle of the picture to the target shape.
  const target = width / height;
  const sw = Math.min(src.width, src.height * target);
  const sh = sw / target;
  // Small pictures aren't blown up.
  const w = Math.max(1, Math.round(Math.min(width, sw)));
  const h = Math.max(1, Math.round(w / target));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, (src.width - sw) / 2, (src.height - sh) / 2, sw, sh, 0, 0, w, h);

  for (const quality of [0.86, 0.75, 0.62, 0.5, 0.38]) {
    let blob = await toBlob(canvas, "image/webp", quality);
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
    if (blob && blob.size <= maxBytes) return toBase64(blob);
  }
  return null;
}
