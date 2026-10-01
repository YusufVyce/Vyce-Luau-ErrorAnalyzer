/**
 * A tiny Redis client. Production talks to Upstash Redis over its REST API
 * (plain fetch, so it runs on Vercel and Cloudflare Workers alike); local
 * development and tests use an in-memory store that answers the same
 * commands with the same reply shapes.
 */

export type Cmd = Array<string | number>;

export interface KV {
  /** Runs one command and returns Redis's reply. */
  run<T = unknown>(cmd: Cmd): Promise<T>;
  /** Runs several commands in one round trip (not atomic). */
  pipeline(cmds: Cmd[]): Promise<unknown[]>;
}

export class UpstashKV implements KV {
  constructor(
    private url: string,
    private token: string,
  ) {
    this.url = url.replace(/\/+$/, "");
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(this.url + path, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Upstash ${res.status}: ${await res.text().catch(() => "")}`);
    return res.json();
  }

  async run<T = unknown>(cmd: Cmd): Promise<T> {
    const reply = (await this.post("", cmd)) as { result?: unknown; error?: string };
    if (reply.error) throw new Error(`Redis: ${reply.error}`);
    return reply.result as T;
  }

  async pipeline(cmds: Cmd[]): Promise<unknown[]> {
    if (cmds.length === 0) return [];
    const replies = (await this.post("/pipeline", cmds)) as Array<{
      result?: unknown;
      error?: string;
    }>;
    return replies.map((r) => {
      if (r.error) throw new Error(`Redis: ${r.error}`);
      return r.result;
    });
  }
}

type Entry =
  | { type: "string"; value: string }
  | { type: "hash"; value: Map<string, string> }
  | { type: "set"; value: Set<string> }
  | { type: "zset"; value: Map<string, number> };

/** Redis formats scores as the shortest round-tripping decimal. */
const fmtScore = (n: number) => String(n);

/** In-memory Redis subset for development and tests. */
export class MemoryKV implements KV {
  private data = new Map<string, Entry>();
  private expires = new Map<string, number>();

  constructor(private now: () => number = () => Date.now()) {}

  private live(key: string): Entry | undefined {
    const at = this.expires.get(key);
    if (at !== undefined && at <= this.now()) {
      this.data.delete(key);
      this.expires.delete(key);
    }
    return this.data.get(key);
  }

  private get<K extends Entry["type"]>(key: string, type: K) {
    const e = this.live(key);
    if (!e) return undefined;
    if (e.type !== type)
      throw new Error("WRONGTYPE Operation against a key holding the wrong kind of value");
    return e as Extract<Entry, { type: K }>;
  }

  private ensure<K extends Entry["type"]>(key: string, type: K): Extract<Entry, { type: K }> {
    const got = this.get(key, type);
    if (got) return got;
    const fresh = (
      type === "string"
        ? { type, value: "" }
        : type === "hash"
          ? { type, value: new Map() }
          : type === "set"
            ? { type, value: new Set() }
            : { type, value: new Map() }
    ) as Extract<Entry, { type: K }>;
    this.data.set(key, fresh);
    return fresh;
  }

  private sortedDesc(key: string): Array<[string, number]> {
    const z = this.get(key, "zset");
    if (!z) return [];
    // Redis orders equal scores by member, descending for ZREVRANGE.
    return [...z.value].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0));
  }

  async pipeline(cmds: Cmd[]): Promise<unknown[]> {
    const out: unknown[] = [];
    for (const c of cmds) out.push(await this.run(c));
    return out;
  }

  async run<T = unknown>(cmd: Cmd): Promise<T> {
    return this.exec(cmd.map(String)) as T;
  }

  private exec([name, ...a]: string[]): unknown {
    const op = name.toUpperCase();
    switch (op) {
      case "GET":
        return this.get(a[0], "string")?.value ?? null;
      case "SET": {
        const [key, value, ...opts] = a;
        const flags = opts.map((o) => o.toUpperCase());
        if (flags.includes("NX") && this.live(key)) return null;
        this.data.set(key, { type: "string", value });
        this.expires.delete(key);
        const ex = flags.indexOf("EX");
        if (ex >= 0) this.expires.set(key, this.now() + Number(opts[ex + 1]) * 1000);
        return "OK";
      }
      case "DEL": {
        let n = 0;
        for (const k of a) {
          if (this.live(k)) n++;
          this.data.delete(k);
          this.expires.delete(k);
        }
        return n;
      }
      case "INCR": {
        const e = this.ensure(a[0], "string");
        const n = (Number(e.value) || 0) + 1;
        e.value = String(n);
        return n;
      }
      case "EXPIRE": {
        if (!this.live(a[0])) return 0;
        this.expires.set(a[0], this.now() + Number(a[1]) * 1000);
        return 1;
      }
      case "TTL": {
        if (!this.live(a[0])) return -2;
        const at = this.expires.get(a[0]);
        return at === undefined ? -1 : Math.ceil((at - this.now()) / 1000);
      }
      case "HSET": {
        const h = this.ensure(a[0], "hash").value;
        let added = 0;
        for (let i = 1; i + 1 < a.length; i += 2) {
          if (!h.has(a[i])) added++;
          h.set(a[i], a[i + 1]);
        }
        return added;
      }
      case "HGET":
        return this.get(a[0], "hash")?.value.get(a[1]) ?? null;
      case "HINCRBY": {
        const h = this.ensure(a[0], "hash").value;
        const n = (Number(h.get(a[1])) || 0) + Number(a[2]);
        h.set(a[1], String(n));
        return n;
      }
      case "HMGET": {
        const h = this.get(a[0], "hash")?.value;
        return a.slice(1).map((f) => h?.get(f) ?? null);
      }
      case "HGETALL": {
        const h = this.get(a[0], "hash")?.value;
        return h ? [...h].flat() : [];
      }
      case "HDEL": {
        const h = this.get(a[0], "hash")?.value;
        let n = 0;
        for (const f of a.slice(1)) if (h?.delete(f)) n++;
        return n;
      }
      case "SADD": {
        const s = this.ensure(a[0], "set").value;
        let n = 0;
        for (const m of a.slice(1)) {
          if (!s.has(m)) n++;
          s.add(m);
        }
        return n;
      }
      case "SREM": {
        const s = this.get(a[0], "set")?.value;
        let n = 0;
        for (const m of a.slice(1)) if (s?.delete(m)) n++;
        return n;
      }
      case "SMEMBERS":
        return [...(this.get(a[0], "set")?.value ?? [])];
      case "SISMEMBER":
        return this.get(a[0], "set")?.value.has(a[1]) ? 1 : 0;
      case "SCARD":
        return this.get(a[0], "set")?.value.size ?? 0;
      case "ZADD": {
        const z = this.ensure(a[0], "zset").value;
        let n = 0;
        for (let i = 1; i + 1 < a.length; i += 2) {
          if (!z.has(a[i + 1])) n++;
          z.set(a[i + 1], Number(a[i]));
        }
        return n;
      }
      case "ZINCRBY": {
        const z = this.ensure(a[0], "zset").value;
        const v = (z.get(a[2]) ?? 0) + Number(a[1]);
        z.set(a[2], v);
        return fmtScore(v);
      }
      case "ZREM": {
        const z = this.get(a[0], "zset")?.value;
        let n = 0;
        for (const m of a.slice(1)) if (z?.delete(m)) n++;
        return n;
      }
      case "ZSCORE": {
        const v = this.get(a[0], "zset")?.value.get(a[1]);
        return v === undefined ? null : fmtScore(v);
      }
      case "ZMSCORE": {
        const z = this.get(a[0], "zset")?.value;
        return a.slice(1).map((m) => {
          const v = z?.get(m);
          return v === undefined ? null : fmtScore(v);
        });
      }
      case "ZREVRANK": {
        const i = this.sortedDesc(a[0]).findIndex(([m]) => m === a[1]);
        return i < 0 ? null : i;
      }
      case "ZCARD":
        return this.get(a[0], "zset")?.value.size ?? 0;
      case "ZREVRANGE": {
        const all = this.sortedDesc(a[0]);
        const start = Number(a[1]);
        const stop = Number(a[2]);
        const slice = all.slice(start, stop < 0 ? all.length + stop + 1 : stop + 1);
        return a[3]?.toUpperCase() === "WITHSCORES"
          ? slice.flatMap(([m, s]) => [m, fmtScore(s)])
          : slice.map(([m]) => m);
      }
      default:
        throw new Error(`MemoryKV: unsupported command ${op}`);
    }
  }
}

/** Every environment variable we can see: process.env (Node, Vercel) and Workers bindings. */
function allEnv(): Record<string, unknown> {
  const fromProcess = typeof process !== "undefined" ? (process.env ?? {}) : {};
  // Nitro keeps the Cloudflare Workers bindings here.
  const fromWorkers = (globalThis as { __env__?: Record<string, unknown> }).__env__ ?? {};
  return { ...fromWorkers, ...fromProcess };
}

export function env(name: string): string | undefined {
  const v = allEnv()[name];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

/**
 * Upstash REST settings. Vercel's storage integration names them
 * KV_REST_API_URL / KV_REST_API_TOKEN, or with a custom prefix
 * (MYDB_KV_REST_API_URL); Upstash itself uses UPSTASH_REDIS_REST_*.
 */
export function findUpstashEnv(vars: Record<string, unknown> = allEnv()): {
  url: string;
  token: string;
} | null {
  const get = (k: string) => {
    const v = vars[k];
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  for (const [urlKey, tokenKey] of [
    ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
    ["KV_REST_API_URL", "KV_REST_API_TOKEN"],
  ]) {
    const url = get(urlKey);
    const token = get(tokenKey);
    if (url && token) return { url, token };
  }
  for (const key of Object.keys(vars)) {
    const m = /^(.*_)(KV_REST_API_URL|UPSTASH_REDIS_REST_URL)$/.exec(key);
    if (!m) continue;
    const url = get(key);
    const token = get(m[1] + m[2].replace(/URL$/, "TOKEN"));
    if (url && token) return { url, token };
  }
  return null;
}

const MEMORY = Symbol.for("vyce.accounts.memoryKV");

/**
 * The account database, or null when it isn't configured. Without Upstash
 * settings, development falls back to memory (lost on restart) while
 * production reports "not configured" instead of silently losing accounts.
 */
export function getKV(): KV | null {
  const upstash = findUpstashEnv();
  if (upstash) return new UpstashKV(upstash.url, upstash.token);
  // import.meta.env.DEV is fixed at build time, so a production build never
  // falls back to memory unless asked to (even where process.env is missing).
  const memoryAllowed = import.meta.env.DEV || env("ACCOUNTS_MEMORY_STORE") === "1";
  if (!memoryAllowed) return null;
  const g = globalThis as { [MEMORY]?: MemoryKV };
  if (!g[MEMORY]) {
    console.warn(
      "[accounts] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set: using an in-memory store (accounts are lost on restart).",
    );
    g[MEMORY] = new MemoryKV();
  }
  return g[MEMORY];
}
