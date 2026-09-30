/**
 * Password hashing and random tokens with Web Crypto only, so the same code
 * runs on Node and Cloudflare Workers.
 */

const enc = new TextEncoder();

/**
 * PBKDF2-SHA256. 100k iterations is the most Cloudflare Workers allows; the
 * count is stored in the hash so it can be raised later without breaking
 * existing passwords.
 */
const ITERATIONS = 100_000;
const PREFIX = "pbkdf2-sha256";

function toB64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toB64Url(bytes: Uint8Array): string {
  return toB64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function randomBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

/** Constant-time comparison, so response time doesn't leak how much matched. */
export function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toB64(salt)}$${toB64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [prefix, iter, salt, hash] = stored.split("$");
  const iterations = Number(iter);
  if (prefix !== PREFIX || !Number.isInteger(iterations) || iterations < 1 || !salt || !hash) {
    return false;
  }
  const got = await derive(password, fromB64(salt), iterations);
  return sameBytes(got, fromB64(hash));
}

/** A hash that never matches, so unknown usernames take as long as wrong passwords. */
let dummyHash: Promise<string> | undefined;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hashPassword("not-a-real-password");
  await verifyPassword(password, await dummyHash);
}

export async function sha256Hex(s: string): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s))));
}

/** Session token for the cookie: 256 random bits. */
export function newToken(): string {
  return toB64Url(randomBytes(32));
}

export function newId(): string {
  return `u_${toHex(randomBytes(8))}`;
}

// No 0/O or 1/I/L, so the code survives being written down by hand.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** One-time recovery code like "K7PX-2MQD-9WZA-4TNE" (about 79 bits). */
export function newRecoveryCode(): string {
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => CODE_ALPHABET[b % CODE_ALPHABET.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

/** Recovery codes are compared without dashes, spaces or case. */
export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
