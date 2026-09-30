/**
 * Account types and rules shared by the browser and the server. Nothing in
 * here may touch the database or secrets: it's bundled into the client too.
 */

export type Board = "day" | "week" | "all" | "streak";
export const BOARDS: Board[] = ["day", "week", "all", "streak"];

export interface PublicUser {
  id: string;
  name: string;
  /** Account XP, as the server counts it. */
  xp: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  /** XP for the XP boards, days for the streak board. */
  score: number;
  /** All-time XP, for the level badge. */
  xp: number;
}

export interface LeaderboardResult {
  board: Board;
  entries: LeaderboardEntry[];
  /** The signed-in student's own row, even when they're below the top list. */
  me?: { rank: number | null; score: number };
  /** When the daily / weekly board starts over (ISO time). */
  resetsAt?: string;
}

export type AccountError =
  | "not_configured"
  | "bad_request"
  | "invalid_username"
  | "reserved_username"
  | "invalid_password"
  | "username_taken"
  | "bad_credentials"
  | "bad_recovery"
  | "rate_limited"
  | "unauthorized"
  | "server_error";

export type Result<T> = ({ ok: true } & T) | { ok: false; error: AccountError };

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

const USERNAME_RE = /^[A-Za-z0-9_]+$/;

/** Names people could mistake for staff, or that would read oddly on the board. */
const RESERVED = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "staff",
  "support",
  "system",
  "root",
  "vyce",
  "yusufvyce",
  "roblox",
  "null",
  "undefined",
  "anonymous",
  "guest",
  "misafir",
]);

export function usernameError(name: string): AccountError | null {
  if (name.length < USERNAME_MIN || name.length > USERNAME_MAX || !USERNAME_RE.test(name)) {
    return "invalid_username";
  }
  if (RESERVED.has(name.toLowerCase())) return "reserved_username";
  return null;
}

export function passwordError(password: string): AccountError | null {
  return password.length < PASSWORD_MIN || password.length > PASSWORD_MAX
    ? "invalid_password"
    : null;
}

/** Error code → UI text key. */
export function accountErrorKey(e: AccountError) {
  return `acc.err.${e}` as const;
}
