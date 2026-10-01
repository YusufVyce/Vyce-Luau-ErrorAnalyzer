/**
 * Checks for uploaded profile photos and banners. The browser already
 * resizes them, but the server only trusts what it can check itself: valid
 * base64, a size limit, and the first bytes of a PNG, JPEG or WebP file
 * (never SVG or HTML, which could carry scripts).
 */

export type ImageType = "image/png" | "image/jpeg" | "image/webp";

const BASE64_RE = /^[A-Za-z0-9+/]+={0,2}$/;

/** Decodes base64, or returns null when it isn't valid base64. */
export function decodeBase64(data: string): Uint8Array<ArrayBuffer> | null {
  if (!data || data.length % 4 !== 0 || !BASE64_RE.test(data)) return null;
  try {
    const bin = atob(data);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** The image type from the file's first bytes, or null for anything else. */
export function imageType(b: Uint8Array): ImageType | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return "image/png";
  }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.subarray(from, to));
  if (b.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}
