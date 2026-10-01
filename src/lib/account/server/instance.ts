/**
 * One account service and one forum per server instance, so their short
 * caches (leaderboards, forum pages) are shared between requests.
 */
import { ForumService } from "./forum";
import { env, getKV } from "./kv";
import { AccountService } from "./service";

let accounts: AccountService | undefined;
let forum: ForumService | undefined;

export function accountService(): AccountService | null {
  if (!accounts) {
    const kv = getKV();
    if (kv) accounts = new AccountService(kv);
  }
  return accounts ?? null;
}

/** Usernames that can moderate the forum: FORUM_ADMINS (comma separated), "vyce" by default. */
function forumAdmins(): string[] {
  const list = (env("FORUM_ADMINS") ?? "vyce")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? list : ["vyce"];
}

export function forumService(): ForumService | null {
  const svc = accountService();
  const kv = getKV();
  if (!svc || !kv) return null;
  forum ??= new ForumService(kv, svc, undefined, forumAdmins());
  return forum;
}
