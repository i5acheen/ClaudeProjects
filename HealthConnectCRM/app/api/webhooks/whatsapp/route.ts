import { NextResponse, type NextRequest } from "next/server";
import { inngest, EVENTS } from "@/inngest/client";
import { adminDb } from "@/lib/db/admin";
import type { Json } from "@/lib/db/types";
import { isDemo } from "@/lib/demo/mode";
import { NotConfiguredError, waEnv } from "@/lib/env";
import { log, requestId } from "@/lib/log";
import { verifyChallenge, verifyHubSignature } from "@/lib/meta/signature";
import { storeWebhookEvents } from "@/lib/webhooks";
import { extractWaEvents } from "@/lib/whatsapp/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Replay protection (CLAUDE.md §10): Meta signs the body but sends no signed request timestamp,
 * and legitimately re-delivers messages for hours after an outage — so we do not drop "old"
 * messages. A replayed body is rejected by the unique event_key (message id) instead.
 */

function configured() {
  try {
    return waEnv();
  } catch (e) {
    if (e instanceof NotConfiguredError) return null;
    throw e;
  }
}

export async function GET(req: NextRequest) {
  const env = configured();
  if (!env) return new NextResponse("WhatsApp is not configured yet", { status: 503 });
  const challenge = verifyChallenge(req.nextUrl.searchParams, env.WA_VERIFY_TOKEN);
  return challenge ? new NextResponse(challenge, { status: 200 }) : new NextResponse("forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  if (isDemo()) return NextResponse.json({ error: "webhooks are disabled in the demo" }, { status: 503 });
  const l = log.child({ route: "webhooks/whatsapp", requestId: requestId(req.headers) });
  const raw = await req.text();
  const env = configured();
  if (!env) return NextResponse.json({ error: "WhatsApp is not configured yet" }, { status: 503 });
  if (!verifyHubSignature(raw, req.headers.get("x-hub-signature-256"), env.META_APP_SECRET)) {
    l.warn("webhook.bad_signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  let events;
  try {
    events = extractWaEvents(JSON.parse(raw));
  } catch {
    l.warn("webhook.invalid_payload");
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  const inserted = await storeWebhookEvents(
    adminDb(),
    "whatsapp",
    events.map((e) => ({ key: e.key, payload: e as unknown as Json })),
  );
  const fresh = events.filter((e) => inserted.has(e.key));
  if (fresh.length) {
    await inngest.send(
      fresh.map((e) =>
        e.kind === "message"
          ? {
              name: EVENTS.waMessage,
              id: e.key,
              data: { webhookEventId: inserted.get(e.key), phoneNumberId: e.phoneNumberId, profileName: e.profileName, message: e.message },
            }
          : { name: EVENTS.waStatus, id: e.key, data: { webhookEventId: inserted.get(e.key), status: e.status } },
      ),
    );
  }
  l.info("webhook.accepted", { events: events.length, enqueued: fresh.length });
  return NextResponse.json({ ok: true });
}
