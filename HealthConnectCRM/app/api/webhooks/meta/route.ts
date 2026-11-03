import { NextResponse, type NextRequest } from "next/server";
import { inngest, EVENTS } from "@/inngest/client";
import { adminDb } from "@/lib/db/admin";
import { isDemo } from "@/lib/demo/mode";
import { metaEnv, NotConfiguredError } from "@/lib/env";
import { log, requestId } from "@/lib/log";
import { verifyChallenge, verifyHubSignature } from "@/lib/meta/signature";
import { extractLeadgenEvents } from "@/lib/meta/webhook";
import { storeWebhookEvents } from "@/lib/webhooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function configured() {
  try {
    return metaEnv();
  } catch (e) {
    if (e instanceof NotConfiguredError) return null;
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const env = configured();
  if (!env) return new NextResponse("Meta Lead Ads is not configured yet", { status: 503 });
  const challenge = verifyChallenge(req.nextUrl.searchParams, env.META_VERIFY_TOKEN);
  return challenge ? new NextResponse(challenge, { status: 200 }) : new NextResponse("forbidden", { status: 403 });
}

/** verify signature → validate → store → enqueue → 200 (CLAUDE.md §4). No slow work here. */
export async function POST(req: NextRequest) {
  if (isDemo()) return NextResponse.json({ error: "webhooks are disabled in the demo" }, { status: 503 });
  const rid = requestId(req.headers);
  const l = log.child({ route: "webhooks/meta", requestId: rid });
  const raw = await req.text();
  const env = configured();
  if (!env) return NextResponse.json({ error: "Meta Lead Ads is not configured yet" }, { status: 503 });
  if (!verifyHubSignature(raw, req.headers.get("x-hub-signature-256"), env.META_APP_SECRET)) {
    l.warn("webhook.bad_signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let events;
  try {
    events = extractLeadgenEvents(JSON.parse(raw));
  } catch {
    l.warn("webhook.invalid_payload");
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
  const db = adminDb();
  const inserted = await storeWebhookEvents(
    db,
    "meta",
    events.map((e) => ({ key: `meta:leadgen:${e.leadgen_id}`, payload: e })),
  );
  const fresh = events.filter((e) => inserted.has(`meta:leadgen:${e.leadgen_id}`));
  if (fresh.length) {
    await inngest.send(
      fresh.map((e) => ({
        name: EVENTS.leadReceived,
        id: `lead-${e.leadgen_id}`,
        data: {
          leadgenId: e.leadgen_id,
          pageId: e.page_id,
          formId: e.form_id,
          webhookEventId: inserted.get(`meta:leadgen:${e.leadgen_id}`),
        },
      })),
    );
  }
  l.info("webhook.accepted", { events: events.length, enqueued: fresh.length });
  return NextResponse.json({ ok: true });
}
