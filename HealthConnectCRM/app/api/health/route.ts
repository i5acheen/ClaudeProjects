import { NextResponse } from "next/server";
import { checkEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + config check. Reports which env var *names* are invalid, never values. */
export async function GET() {
  const env = checkEnv();
  const body = { status: env.ok ? "ok" : "degraded", env: env.ok ? "ok" : { invalid: env.problems }, region: process.env.VERCEL_REGION ?? "local", time: new Date().toISOString() };
  return NextResponse.json(body, { status: env.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
