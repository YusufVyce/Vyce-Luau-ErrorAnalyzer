/**
 * Account types and rules shared by the browser and the server. Nothing in
 * here may touch the database or secrets: it's bundled into the client too.
 */

export type Board = "day" | "week" | "all" | "streak";
export const BOARDS: Board[] = ["day", "week", "all", "streak"];

/** Weekly leagues, lowest first. Top players move up a league each week, the last ones move down. */
export const LEAGUES = [
  { en: "Bronze", tr: "Bronz", color: "#cd7f32" },
  { en: "Silver", tr: "Gümüş", color: "#a8b3c2" },
  { en: "Gold", tr: "Altın", color: "#f5b82e" },
  { en: "Platinum", tr: "Platin", color: "#5ec8d8" },
  { en: "Diamond", tr: "Elmas", color: "#8b7cf6" },
] as const;

/**
 * Something the student did that earns XP. The server checks it before
 * paying out: homework and challenge code is run again in the simulator,
 * quiz and practice answers are compared with the real answers.
 */
export interface SolvedStep {
  lessonId: string;
  /** Index in PATH[lessonId].steps. */
  step: number;
  pick?: number | null;
  seq?: number[];
}

export type Claim =
  | { kind: "quiz"; lessonId: string; answer: number; day?: string }
  | {
      kind: "homework";
      lessonId: string;
      code: string;
      hints: number;
      solution: boolean;
      day?: string;
    }
  | { kind: "challenge"; id: string; code: string; hints: number; solution: boolean; day?: string }
  | {
      kind: "practice";
      /** The lesson's own practice; leave out for a mixed review. */
      lessonId?: string;
      mistakes: number;
      answers: SolvedStep[];
      day?: string;
    };

export interface ClaimOutcome {
  awarded: number;
  /** Quizzes: whether the answer was right. */
  correct?: boolean;
}

export interface LeagueResult {
  week: string;
  from: number;
  to: number;
  rank: number;
}

export interface LeagueBoard {
  week: string;
  tier: number;
  entries: LeaderboardEntry[];
  me?: { rank: number | null; score: number };
  /** How many places at the top move up and at the bottom move down (with the current players). */
  promote: number;
  demote: number;
  players: number;
  resetsAt: string;
  /** Last week's result, to celebrate (or soften) a move. */
  last?: LeagueResult;
}

export interface FriendRow {
  id: string;
  name: string;
  /** Profile photo version (0 = none). */
  avatar: number;
  week: number;
  xp: number;
  streak: number;
  me: boolean;
}

/** What anyone can see on /u/name: stats, no saved code or settings. */
export interface PublicProfile {
  id: string;
  name: string;
  /** Profile photo and banner versions (0 = none); see imageUrl. */
  avatar: number;
  banner: number;
  createdAt: string;
  xp: number;
  streak: number;
  league: number;
  weekXp: number;
  quiz: string[];
  homework: string[];
  challenges: string[];
  stars: Record<string, number>;
  /** Active days (YYYY-MM-DD), the most recent ones only. */
  days: string[];
  /** Ids of the achievements earned. */
  achievements: string[];
  isMe: boolean;
  following: boolean;
  followers: number;
}

export interface PublicUser {
  id: string;
  name: string;
  /** Account XP, as the server counts it. */
  xp: number;
  createdAt: string;
  /** Profile photo and banner versions (0 = none); see imageUrl. */
  avatar: number;
  banner: number;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  /** XP for the XP boards, days for the streak board. */
  score: number;
  /** All-time XP, for the level badge. */
  xp: number;
  /** Profile photo version (0 = none). */
  avatar: number;
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
  | "rejected"
  | "not_found"
  | "too_many_friends"
  | "bad_image"
  | "forbidden"
  | "locked"
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

// ------------------------------------------------------------------ profile images

export type ImageKind = "avatar" | "banner";
export const IMAGE_KINDS: ImageKind[] = ["avatar", "banner"];

/** Size the browser resizes uploads to, and the largest file the server keeps. */
export const IMAGE_SPECS: Record<ImageKind, { width: number; height: number; maxBytes: number }> = {
  avatar: { width: 256, height: 256, maxBytes: 80_000 },
  banner: { width: 1200, height: 400, maxBytes: 240_000 },
};

/** Where a player's photo or banner is served; the version makes each upload a new URL. */
export function imageUrl(id: string, kind: ImageKind, version: number): string {
  return `/api/img/${encodeURIComponent(id)}/${kind}?v=${version}`;
}

// ------------------------------------------------------------------ forum

export const FORUM_CATEGORIES = [
  { id: "general", en: "General", tr: "Genel sohbet" },
  { id: "help", en: "Scripting help", tr: "Script yardımı" },
  { id: "showcase", en: "Showcase", tr: "Projelerini paylaş" },
  { id: "feedback", en: "Site feedback", tr: "Site önerileri" },
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number]["id"];

export const FORUM_TITLE_MIN = 4;
export const FORUM_TITLE_MAX = 100;
export const FORUM_BODY_MAX = 8000;
export const FORUM_PAGE = 20;
export const FORUM_POSTS_PAGE = 30;

/** A person as the forum shows them. */
export interface ForumAuthor {
  id: string;
  /** Empty when the account was deleted. */
  name: string;
  avatar: number;
  xp: number;
}

export interface ForumThreadRow {
  id: number;
  title: string;
  category: ForumCategory;
  author: ForumAuthor;
  createdAt: number;
  lastAt: number;
  lastBy: ForumAuthor | null;
  replies: number;
  pinned: boolean;
  locked: boolean;
}

export interface ForumPost {
  /** 1 is the opening post. */
  n: number;
  author: ForumAuthor;
  body: string;
  createdAt: number;
  deleted: boolean;
}

export interface ForumThread extends ForumThreadRow {
  posts: ForumPost[];
  /** How many posts (including the opening one) the thread has. */
  total: number;
  page: number;
  /** The signed-in viewer can pin, lock and delete anything. */
  canModerate: boolean;
}

export function forumTitleError(title: string): AccountError | null {
  const t = title.trim();
  return t.length < FORUM_TITLE_MIN || t.length > FORUM_TITLE_MAX ? "bad_request" : null;
}

export function forumBodyError(body: string): AccountError | null {
  const b = body.trim();
  return b.length < 1 || b.length > FORUM_BODY_MAX ? "bad_request" : null;
}
