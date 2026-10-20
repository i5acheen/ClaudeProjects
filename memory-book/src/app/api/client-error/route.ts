import { NextResponse } from "next/server";
import { scrubReport } from "@/lib/monitoring/scrub";

/**
 * Receives error reports from browsers so problems can be fixed. Reports are
 * scrubbed again here (see lib/monitoring/scrub.ts): no names, memories,
 * photos, emails or IDs are kept — they're written only to the server log.
 */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const seen = new Map<string, { count: number; since: number }>();

export async function POST(request: Request) {
  // A small limit per visitor, so this can't be used to flood the logs.
  const who = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const entry = seen.get(who);
  if (!entry || now - entry.since > WINDOW_MS) seen.set(who, { count: 1, since: now });
  else if (++entry.count > MAX_PER_WINDOW) return new NextResponse(null, { status: 429 });
  if (seen.size > 5000) seen.clear();

  const text = await request.text();
  if (text.length > 8_000) return new NextResponse(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  console.error(JSON.stringify({ type: "client-error", ...scrubReport(body) }));
  return new NextResponse(null, { status: 204 });
}
