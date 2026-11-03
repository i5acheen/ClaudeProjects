import { NextResponse } from "next/server";
import { checkEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness + config check. 503 only when core settings are missing; integrations report separately. Names only, never values. */
export async function GET() {
  if (process.env.DEMO_MODE === "1" || process.env.NEXT_PUBLIC_DEMO_MODE === "1") {
    return NextResponse.json(
      { status: "ok", mode: "demo (sample data, no database)", time: new Date().toISOString() },
      { headers: { "cache-control": "no-store" } },
    );
  }
  const env = checkEnv();
  const ok = env.core.length === 0;
  const integration = (missing: string[]) => (missing.length ? { status: "not configured", missing } : "configured");
  const body = {
    status: ok ? "ok" : "degraded",
    env: ok ? "ok" : { invalid: env.core },
    integrations: { meta_lead_ads: integration(env.meta), whatsapp: integration(env.whatsapp), ai: process.env.AI_PROVIDER || "none" },
    region: process.env.VERCEL_REGION ?? "local",
    time: new Date().toISOString(),
  };
  return NextResponse.json(body, { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } });
}
