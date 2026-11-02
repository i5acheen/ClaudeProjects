import "server-only";
import { cookies } from "next/headers";
import { deflateRawSync, inflateRawSync } from "node:zlib";
import type { Row, Tables } from "./data";

/**
 * Per-visitor change log for the prototype. Vercel runs several server instances, so in-memory changes alone
 * would appear and disappear between requests. Every write is appended to a compressed log in the visitor's
 * own cookies and replayed onto the sample data by whichever instance answers. Visitors never see each other's
 * changes. Size is capped (oldest changes drop off); "Reset sample data" clears the log.
 */
export type Actor = {
  userId: string | null;
  role: "admin" | "coordinator" | "hospital_partner" | "viewer" | "service";
  hospitalId: string | null;
};
export type FilterSpec = [op: string, col: string, val: unknown];
export type Op =
  | {
      k: "w";
      t: string;
      m: "insert" | "upsert" | "update" | "delete";
      rows?: Row[];
      patch?: Row;
      f?: FilterSpec[];
      c?: string[];
      now: string;
    }
  | { k: "r"; n: string; args: Record<string, unknown>; a: Actor; now: string };

const PREFIX = "hc_demo_log_";
const CHUNK = 3600;
const MAX_CHUNKS = 4;
const COOKIE = { path: "/", httpOnly: true, sameSite: "lax" as const, maxAge: 12 * 3600 };

type Jar = Awaited<ReturnType<typeof cookies>>;
// Within one request, later reads must see that request's writes even before the browser sends the cookie back.
const pending = new WeakMap<Jar, string>();

function readRaw(jar: Jar): string {
  const p = pending.get(jar);
  if (p !== undefined) return p;
  let raw = "";
  for (let i = 0; i < MAX_CHUNKS; i++) raw += jar.get(`${PREFIX}${i}`)?.value ?? "";
  return raw;
}

export function decodeOps(raw: string): Op[] {
  if (!raw) return [];
  try {
    return JSON.parse(inflateRawSync(Buffer.from(raw, "base64url")).toString("utf8")) as Op[];
  } catch {
    return []; // tampered or from an older version: start from the sample data
  }
}

export function encodeOps(ops: Op[]): { raw: string; ops: Op[] } {
  let list = ops;
  for (;;) {
    const raw = deflateRawSync(Buffer.from(JSON.stringify(list), "utf8"), { level: 9 }).toString("base64url");
    if (raw.length <= CHUNK * MAX_CHUNKS || list.length <= 1) return { raw, ops: list };
    list = list.slice(Math.ceil(list.length / 10)); // drop the oldest 10 %
  }
}

/** Current request's log (raw string is the cache key for the replayed state). */
export async function currentLog(): Promise<{ jar: Jar | null; raw: string }> {
  try {
    const jar = await cookies();
    return { jar, raw: readRaw(jar) };
  } catch {
    return { jar: null, raw: "" }; // outside a request (tests, scripts)
  }
}

/** Appends an op. Returns the new raw log, or null when cookies can't be written (page render). */
export function appendOp(jar: Jar | null, raw: string, op: Op): string | null {
  if (!jar) return null;
  const { raw: next } = encodeOps([...decodeOps(raw), op]);
  try {
    for (let i = 0; i < MAX_CHUNKS; i++) {
      const part = next.slice(i * CHUNK, (i + 1) * CHUNK);
      if (part) jar.set(`${PREFIX}${i}`, part, COOKIE);
      else if (jar.get(`${PREFIX}${i}`)) jar.delete(`${PREFIX}${i}`);
    }
  } catch {
    return null; // Server Component render: cookies are read-only; the change stays local to this render
  }
  pending.set(jar, next);
  return next;
}

export async function clearLog(): Promise<void> {
  const jar = await cookies();
  for (let i = 0; i < MAX_CHUNKS; i++) jar.delete(`${PREFIX}${i}`);
  pending.set(jar, "");
}

// Replayed states per log, per server instance (small LRU).
const cache = new Map<string, Tables>();
export function cacheGet(raw: string): Tables | undefined {
  const s = cache.get(raw);
  if (s) {
    cache.delete(raw);
    cache.set(raw, s);
  }
  return s;
}
export function cachePut(raw: string, s: Tables): void {
  cache.set(raw, s);
  while (cache.size > 200) cache.delete(cache.keys().next().value as string);
}
