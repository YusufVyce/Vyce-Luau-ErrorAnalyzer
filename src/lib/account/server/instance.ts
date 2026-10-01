/**
 * One account service, forum and admin panel per server instance, so their
 * short caches (leaderboards, forum pages, roles, settings) are shared
 * between requests.
 */
import { AdminService } from "./admin";
import { ForumService } from "./forum";
import { getKV } from "./kv";
import { AccountService } from "./service";

let accounts: AccountService | undefined;
let forum: ForumService | undefined;
let admin: AdminService | undefined;

export function accountService(): AccountService | null {
  if (!accounts) {
    const kv = getKV();
    if (kv) accounts = new AccountService(kv);
  }
  return accounts ?? null;
}

export function forumService(): ForumService | null {
  const svc = accountService();
  const kv = getKV();
  if (!svc || !kv) return null;
  forum ??= new ForumService(kv, svc);
  return forum;
}

export function adminService(): AdminService | null {
  const svc = accountService();
  const f = forumService();
  const kv = getKV();
  if (!svc || !f || !kv) return null;
  admin ??= new AdminService(kv, svc, f);
  return admin;
}
