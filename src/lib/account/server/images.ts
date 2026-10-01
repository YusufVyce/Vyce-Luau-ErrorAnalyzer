/**
 * Uploaded pictures (profile photos, banners, forum images). The browser
 * already crops and shrinks them, but the server only trusts what it can
 * check itself: valid base64, a size limit, and the first bytes of a PNG,
 * JPEG, WebP or GIF file (never SVG or HTML, which could carry scripts).
 *
 * Upstash limits one request to about 1 MB, so pictures are stored in
 * chunks: the first under `key`, the rest under `key:1`, `key:2`, …
 */
import type { Cmd, KV } from "./kv";

export type ImageType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

/** base64 characters per stored chunk (a multiple of 4, well under 1 MB). */
export const CHUNK = 512 * 1024;
export const MAX_CHUNKS = 8;

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
  if (b.length >= 6 && (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a")) return "image/gif";
  return null;
}

const chunkKey = (key: string, i: number) => (i === 0 ? key : `${key}:${i}`);

/**
 * Stores base64 data in chunks (one request each, so none is too big).
 * `ttl` (seconds) makes it temporary, e.g. a forum image not posted yet.
 */
export async function saveBlob(kv: KV, key: string, data: string, ttl?: number): Promise<number> {
  const parts: string[] = [];
  for (let i = 0; i < data.length; i += CHUNK) parts.push(data.slice(i, i + CHUNK));
  if (parts.length === 0 || parts.length > MAX_CHUNKS) throw new Error("bad blob size");
  for (let i = 0; i < parts.length; i++) {
    const cmd: Cmd = ["SET", chunkKey(key, i), parts[i]];
    if (ttl) cmd.push("EX", ttl);
    await kv.run(cmd);
  }
  // Leftovers of a bigger picture stored here before.
  const extra: string[] = [];
  for (let i = parts.length; i < MAX_CHUNKS; i++) extra.push(chunkKey(key, i));
  await kv.run(["DEL", ...extra]);
  return parts.length;
}

/** The whole base64 string, or null. */
export async function loadBlob(kv: KV, key: string): Promise<string | null> {
  const first = await kv.run<string | null>(["GET", key]);
  if (typeof first !== "string") return null;
  if (first.length < CHUNK) return first;
  let out = first;
  for (let i = 1; i < MAX_CHUNKS; i++) {
    const part = await kv.run<string | null>(["GET", chunkKey(key, i)]);
    if (typeof part !== "string") break;
    out += part;
    if (part.length < CHUNK) break;
  }
  return out;
}

/** Commands that delete a stored picture. */
export function deleteBlobCmds(key: string): Cmd[] {
  return [["DEL", ...Array.from({ length: MAX_CHUNKS }, (_, i) => chunkKey(key, i))]];
}

/** Commands that make a temporary picture permanent. */
export function persistBlobCmds(key: string): Cmd[] {
  return Array.from({ length: MAX_CHUNKS }, (_, i): Cmd => ["PERSIST", chunkKey(key, i)]);
}
