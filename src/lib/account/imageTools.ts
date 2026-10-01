/**
 * Turns picked files into small uploads, in the browser:
 *
 * - Pictures are cropped to the area chosen in the crop dialog, scaled down
 *   and saved as WebP (JPEG where the browser can't write WebP), getting
 *   smaller until they fit the size limit.
 * - GIFs stay animated: every frame is decoded, cropped, scaled and encoded
 *   again (the GIF libraries load only when a GIF is picked).
 */
import { FORUM_IMAGE_SPEC, IMAGE_SPECS, type ImageKind } from "./shared";

/** Part of the original picture, in its own pixels. */
export interface CropRect {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

export const isGif = (file: Blob) => file.type === "image/gif";

export async function loadImage(
  file: Blob,
): Promise<CanvasImageSource & { width: number; height: number }> {
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

export function toBase64(data: Blob | Uint8Array): Promise<string> {
  const blob = data instanceof Blob ? data : new Blob([data as Uint8Array<ArrayBuffer>]);
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).replace(/^data:[^,]*,/, ""));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Output size: the target size, but small pictures aren't blown up. */
function outputSize(rect: CropRect, maxW: number, maxH: number): { w: number; h: number } {
  const scale = Math.min(1, maxW / rect.sw, maxH / rect.sh);
  return {
    w: Math.max(1, Math.round(rect.sw * scale)),
    h: Math.max(1, Math.round(rect.sh * scale)),
  };
}

/** Crops and encodes a still picture; base64, or null if it can't fit `maxBytes`. */
async function encodeStill(
  src: CanvasImageSource,
  rect: CropRect,
  maxW: number,
  maxH: number,
  maxBytes: number,
): Promise<string | null> {
  for (const shrink of [1, 0.8, 0.6]) {
    const { w, h } = outputSize(rect, maxW * shrink, maxH * shrink);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(src, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
    for (const quality of [0.88, 0.78, 0.66, 0.54]) {
      let blob = await toBlob(canvas, "image/webp", quality);
      if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= maxBytes) return toBase64(blob);
    }
  }
  return null;
}

const MAX_FRAMES = 120;
const yieldToBrowser = () => new Promise((r) => setTimeout(r, 0));

/**
 * Crops and scales every frame of an animated GIF and encodes it again.
 * Tries smaller sizes (and fewer frames) until the file fits `maxBytes`.
 */
export async function encodeGif(
  buffer: ArrayBuffer,
  rect: CropRect,
  maxW: number,
  maxH: number,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const [{ parseGIF, decompressFrames }, { GIFEncoder, quantize, applyPalette }] =
    await Promise.all([import("gifuct-js"), import("gifenc")]);
  const gif = parseGIF(buffer);
  const frames = decompressFrames(gif, true);
  if (frames.length === 0) return null;
  const W = gif.lsd.width;
  const H = gif.lsd.height;

  for (const [shrink, step] of [
    [1, 1],
    [0.8, 1],
    [0.65, 2],
    [0.5, 2],
    [0.4, 3],
  ] as const) {
    const every = Math.max(step, Math.ceil(frames.length / MAX_FRAMES));
    const { w, h } = outputSize(rect, maxW * shrink, maxH * shrink);
    const full = document.createElement("canvas");
    full.width = W;
    full.height = H;
    const fctx = full.getContext("2d", { willReadFrequently: true })!;
    const patch = document.createElement("canvas");
    const pctx = patch.getContext("2d")!;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const octx = out.getContext("2d", { willReadFrequently: true })!;
    octx.imageSmoothingQuality = "high";
    const enc = GIFEncoder();
    let saved: ImageData | null = null;
    let delay = 0;

    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      if (f.disposalType === 3) saved = fctx.getImageData(0, 0, W, H);
      patch.width = f.dims.width;
      patch.height = f.dims.height;
      pctx.putImageData(
        new ImageData(new Uint8ClampedArray(f.patch), f.dims.width, f.dims.height),
        0,
        0,
      );
      fctx.drawImage(patch, f.dims.left, f.dims.top);
      delay += f.delay;
      if (i % every === 0 || i === frames.length - 1) {
        octx.clearRect(0, 0, w, h);
        octx.drawImage(full, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, w, h);
        const rgba = octx.getImageData(0, 0, w, h).data;
        const palette = quantize(rgba, 256, { format: "rgba4444", oneBitAlpha: true });
        const index = applyPalette(rgba, palette, "rgba4444");
        const clear = palette.findIndex((c) => c[3] === 0);
        enc.writeFrame(index, w, h, {
          palette,
          delay: Math.max(20, delay),
          transparent: clear >= 0,
          transparentIndex: Math.max(0, clear),
        });
        delay = 0;
        if (i % 8 === 0) await yieldToBrowser();
      }
      if (f.disposalType === 2)
        fctx.clearRect(f.dims.left, f.dims.top, f.dims.width, f.dims.height);
      else if (f.disposalType === 3 && saved) fctx.putImageData(saved, 0, 0);
    }
    enc.finish();
    const bytes = enc.bytes();
    if (bytes.length <= maxBytes) return bytes;
  }
  return null;
}

/** A profile photo or banner cut to `rect`: base64, or null when it can't be made small enough. */
export async function cropForUpload(
  file: Blob,
  kind: ImageKind,
  rect: CropRect,
): Promise<string | null> {
  const spec = IMAGE_SPECS[kind];
  if (isGif(file)) {
    // Animated: a little smaller than stills, GIF frames are much bigger than WebP.
    const scale = kind === "avatar" ? 0.8 : 0.75;
    const bytes = await encodeGif(
      await file.arrayBuffer(),
      rect,
      spec.width * scale,
      spec.height * scale,
      spec.gifMaxBytes,
    );
    return bytes ? toBase64(bytes) : null;
  }
  const src = await loadImage(file);
  return encodeStill(src, rect, spec.width, spec.height, spec.maxBytes);
}

/** A forum picture: GIFs as they are when small enough, everything else scaled down. */
export async function prepareForumImage(file: Blob): Promise<string | null> {
  const { maxSide, maxBytes, gifMaxBytes } = FORUM_IMAGE_SPEC;
  if (isGif(file)) {
    if (file.size <= gifMaxBytes) return toBase64(file);
    const buffer = await file.arrayBuffer();
    const { parseGIF } = await import("gifuct-js");
    const { width, height } = parseGIF(buffer).lsd;
    const bytes = await encodeGif(
      buffer,
      { sx: 0, sy: 0, sw: width, sh: height },
      800,
      800,
      gifMaxBytes,
    );
    return bytes ? toBase64(bytes) : null;
  }
  const src = await loadImage(file);
  return encodeStill(
    src,
    { sx: 0, sy: 0, sw: src.width, sh: src.height },
    maxSide,
    maxSide,
    maxBytes,
  );
}
