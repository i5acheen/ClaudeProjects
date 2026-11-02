import { NextResponse } from "next/server";
import { checkEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + config check. Reports which env var *names* are invalid, never values. */
export async function GET() {
  if (process.env.DEMO_MODE === "1" || process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
    return NextResponse.json(
      { status: "ok", mode: "demo (sample data, no database)", time: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const env = checkEnv();
  const body = {
    status: env.ok ? "ok" : "degraded",
    env: env.ok ? "ok" : { invalid: env.problems },
    region: process.env.VERCEL_REGION ?? "local",
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: env.ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
