/**
 * Lua 5.1 pattern matching (string.find/match/gmatch/gsub), ported from
 * lstrlib.c. Positions are 0-based internally; callers convert to 1-based.
 */
import { LuaError } from "./values";

const CAP_UNFINISHED = -1;
const CAP_POSITION = -2;
const MAXCCALLS = 200;

interface Capture {
  init: number;
  len: number;
}

class MatchState {
  level = 0;
  capture: Capture[] = [];
  depth = 0;
  constructor(
    public src: string,
    public pat: string,
  ) {}
}

function classEnd(ms: MatchState, p: number): number {
  const pat = ms.pat;
  const c = pat[p++];
  if (c === "%") {
    if (p >= pat.length) throw new LuaError("malformed pattern (ends with '%')");
    return p + 1;
  }
  if (c === "[") {
    if (pat[p] === "^") p++;
    do {
      if (p >= pat.length) throw new LuaError("malformed pattern (missing ']')");
      const cc = pat[p++];
      if (cc === "%") p++;
    } while (pat[p] !== "]");
    return p + 1;
  }
  return p;
}

function isAlpha(c: number) {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}
function isDigit(c: number) {
  return c >= 48 && c <= 57;
}
function isSpace(c: number) {
  return c === 32 || (c >= 9 && c <= 13);
}
function isPunct(c: number) {
  return (
    (c >= 33 && c <= 47) || (c >= 58 && c <= 64) || (c >= 91 && c <= 96) || (c >= 123 && c <= 126)
  );
}

function matchClass(c: number, cl: string): boolean {
  let res: boolean;
  switch (cl.toLowerCase()) {
    case "a":
      res = isAlpha(c);
      break;
    case "c":
      res = c < 32 || c === 127;
      break;
    case "d":
      res = isDigit(c);
      break;
    case "g":
      res = c > 32 && c < 127;
      break;
    case "l":
      res = c >= 97 && c <= 122;
      break;
    case "p":
      res = isPunct(c);
      break;
    case "s":
      res = isSpace(c);
      break;
    case "u":
      res = c >= 65 && c <= 90;
      break;
    case "w":
      res = isAlpha(c) || isDigit(c);
      break;
    case "x":
      res = isDigit(c) || (c >= 97 && c <= 102) || (c >= 65 && c <= 70);
      break;
    case "z":
      res = c === 0;
      break;
    default:
      return cl.charCodeAt(0) === c;
  }
  return cl === cl.toUpperCase() && cl !== cl.toLowerCase() ? !res : res;
}

function matchBracketClass(ms: MatchState, c: number, p: number, ec: number): boolean {
  const pat = ms.pat;
  let sig = true;
  if (pat[p + 1] === "^") {
    sig = false;
    p++;
  }
  while (++p < ec) {
    if (pat[p] === "%") {
      p++;
      if (matchClass(c, pat[p])) return sig;
    } else if (pat[p + 1] === "-" && p + 2 < ec) {
      p += 2;
      if (pat.charCodeAt(p - 2) <= c && c <= pat.charCodeAt(p)) return sig;
    } else if (pat.charCodeAt(p) === c) return sig;
  }
  return !sig;
}

function singleMatch(ms: MatchState, s: number, p: number, ep: number): boolean {
  if (s >= ms.src.length) return false;
  const c = ms.src.charCodeAt(s);
  switch (ms.pat[p]) {
    case ".":
      return true;
    case "%":
      return matchClass(c, ms.pat[p + 1]);
    case "[":
      return matchBracketClass(ms, c, p, ep - 1);
    default:
      return ms.pat.charCodeAt(p) === c;
  }
}

function matchBalance(ms: MatchState, s: number, p: number): number {
  if (p + 1 >= ms.pat.length) throw new LuaError("malformed pattern (missing arguments to '%b')");
  if (s >= ms.src.length || ms.src[s] !== ms.pat[p]) return -1;
  const b = ms.pat[p];
  const e = ms.pat[p + 1];
  let cont = 1;
  while (++s < ms.src.length) {
    if (ms.src[s] === e) {
      if (--cont === 0) return s + 1;
    } else if (ms.src[s] === b) cont++;
  }
  return -1;
}

function maxExpand(ms: MatchState, s: number, p: number, ep: number): number {
  let i = 0;
  while (singleMatch(ms, s + i, p, ep)) i++;
  while (i >= 0) {
    const res = doMatch(ms, s + i, ep + 1);
    if (res !== -1) return res;
    i--;
  }
  return -1;
}

function minExpand(ms: MatchState, s: number, p: number, ep: number): number {
  for (;;) {
    const res = doMatch(ms, s, ep + 1);
    if (res !== -1) return res;
    if (singleMatch(ms, s, p, ep)) s++;
    else return -1;
  }
}

function startCapture(ms: MatchState, s: number, p: number, what: number): number {
  ms.capture[ms.level] = { init: s, len: what };
  ms.level++;
  const res = doMatch(ms, s, p);
  if (res === -1) ms.level--;
  return res;
}

function endCapture(ms: MatchState, s: number, p: number): number {
  let l = -1;
  for (let level = ms.level - 1; level >= 0; level--) {
    if (ms.capture[level].len === CAP_UNFINISHED) {
      l = level;
      break;
    }
  }
  if (l < 0) throw new LuaError("invalid pattern capture");
  ms.capture[l].len = s - ms.capture[l].init;
  const res = doMatch(ms, s, p);
  if (res === -1) ms.capture[l].len = CAP_UNFINISHED;
  return res;
}

function matchCapture(ms: MatchState, s: number, l: number): number {
  const idx = l - 49; // '1'
  if (idx < 0 || idx >= ms.level || ms.capture[idx].len === CAP_UNFINISHED)
    throw new LuaError("invalid capture index");
  const cap = ms.src.substr(ms.capture[idx].init, ms.capture[idx].len);
  if (ms.src.length - s >= cap.length && ms.src.substr(s, cap.length) === cap)
    return s + cap.length;
  return -1;
}

function doMatch(ms: MatchState, s: number, p: number): number {
  if (++ms.depth > MAXCCALLS) throw new LuaError("pattern too complex");
  try {
    for (;;) {
      if (p >= ms.pat.length) return s;
      const pc = ms.pat[p];
      if (pc === "(") {
        if (ms.pat[p + 1] === ")") return startCapture(ms, s, p + 2, CAP_POSITION);
        return startCapture(ms, s, p + 1, CAP_UNFINISHED);
      }
      if (pc === ")") return endCapture(ms, s, p + 1);
      if (pc === "$" && p + 1 === ms.pat.length) return s === ms.src.length ? s : -1;
      if (pc === "%") {
        const nc = ms.pat[p + 1];
        if (nc === "b") {
          s = matchBalance(ms, s, p + 2);
          if (s === -1) return -1;
          p += 4;
          continue;
        }
        if (nc === "f") {
          p += 2;
          if (ms.pat[p] !== "[") throw new LuaError("missing '[' after '%f' in pattern");
          const ep = classEnd(ms, p);
          const prev = s === 0 ? 0 : ms.src.charCodeAt(s - 1);
          const cur = s < ms.src.length ? ms.src.charCodeAt(s) : 0;
          if (!matchBracketClass(ms, prev, p, ep - 1) && matchBracketClass(ms, cur, p, ep - 1)) {
            p = ep;
            continue;
          }
          return -1;
        }
        if (nc && isDigit(nc.charCodeAt(0))) {
          s = matchCapture(ms, s, nc.charCodeAt(0));
          if (s === -1) return -1;
          p += 2;
          continue;
        }
      }
      const ep = classEnd(ms, p);
      const m = singleMatch(ms, s, p, ep);
      const q = ms.pat[ep];
      if (q === "?") {
        if (m) {
          const res = doMatch(ms, s + 1, ep + 1);
          if (res !== -1) return res;
        }
        p = ep + 1;
        continue;
      }
      if (q === "*") return maxExpand(ms, s, p, ep);
      if (q === "+") return m ? maxExpand(ms, s + 1, p, ep) : -1;
      if (q === "-") return minExpand(ms, s, p, ep);
      if (!m) return -1;
      s++;
      p = ep;
    }
  } finally {
    ms.depth--;
  }
}

function getCapture(ms: MatchState, i: number, s: number, e: number): string | number {
  if (i >= ms.level) {
    if (i === 0) return ms.src.slice(s, e);
    throw new LuaError("invalid capture index");
  }
  const cap = ms.capture[i];
  if (cap.len === CAP_UNFINISHED) throw new LuaError("unfinished capture");
  if (cap.len === CAP_POSITION) return cap.init + 1;
  return ms.src.substr(cap.init, cap.len);
}

function captures(
  ms: MatchState,
  s: number,
  e: number,
  wholeIfNone: boolean,
): Array<string | number> {
  const n = ms.level === 0 && wholeIfNone ? 1 : ms.level;
  const out: Array<string | number> = [];
  for (let i = 0; i < n; i++) out.push(getCapture(ms, i, s, e));
  return out;
}

const SPECIALS = /[\^$*+?.()[\]%-]/;

/** string.find / string.match core. Returns [start0, end0, captures] or undefined. */
export function strFind(
  src: string,
  pat: string,
  init: number,
  plain: boolean,
  find: boolean,
): unknown[] {
  if (init > src.length) return [undefined];
  if (find && (plain || !SPECIALS.test(pat))) {
    const idx = src.indexOf(pat, init);
    return idx === -1 ? [undefined] : [idx + 1, idx + pat.length];
  }
  const anchor = pat[0] === "^";
  const p = anchor ? 1 : 0;
  let s = init;
  const ms = new MatchState(src, pat);
  do {
    ms.level = 0;
    ms.depth = 0;
    const e = doMatch(ms, s, p);
    if (e !== -1) {
      if (find) return [s + 1, e, ...captures(ms, -1, -1, false)];
      return captures(ms, s, e, true);
    }
    s++;
  } while (s <= src.length && !anchor);
  return [undefined];
}

export function* gmatchIter(src: string, pat: string): Generator<Array<string | number>> {
  const ms = new MatchState(src, pat);
  let s = 0;
  while (s <= src.length) {
    ms.level = 0;
    ms.depth = 0;
    const e = doMatch(ms, s, 0);
    if (e !== -1) {
      const caps = captures(ms, s, e, true);
      s = e === s ? e + 1 : e;
      yield caps;
    } else {
      s++;
    }
  }
}

export type GsubRepl = (whole: string, caps: Array<string | number>) => string | undefined;

/** Core of string.gsub; `replace` returns the replacement or undefined to keep the match. */
export function gsubCore(
  src: string,
  pat: string,
  maxN: number,
  replace: GsubRepl,
): [string, number] {
  const anchor = pat[0] === "^";
  const p = anchor ? 1 : 0;
  const ms = new MatchState(src, pat);
  let s = 0;
  let n = 0;
  let out = "";
  while (n < maxN) {
    ms.level = 0;
    ms.depth = 0;
    const e = doMatch(ms, s, p);
    if (e !== -1) {
      n++;
      const whole = src.slice(s, e);
      const caps = captures(ms, s, e, true);
      const r = replace(whole, caps);
      out += r === undefined ? whole : r;
    }
    if (e !== -1 && e > s) s = e;
    else if (s < src.length) out += src[s++];
    else break;
    if (anchor) break;
  }
  return [out + src.slice(s), n];
}

/** Expands %0-%9 and %% in a gsub replacement string. */
export function expandReplacement(
  repl: string,
  whole: string,
  caps: Array<string | number>,
): string {
  let out = "";
  for (let i = 0; i < repl.length; i++) {
    const c = repl[i];
    if (c !== "%") {
      out += c;
      continue;
    }
    const d = repl[++i];
    if (d === "%") out += "%";
    else if (d >= "0" && d <= "9") {
      if (d === "0") out += whole;
      else {
        const cap = caps[Number(d) - 1];
        if (cap === undefined)
          throw new LuaError("invalid capture index %" + d + " in replacement string");
        out += String(cap);
      }
    } else throw new LuaError("invalid use of '%' in replacement string");
  }
  return out;
}
