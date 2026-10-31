import "server-only";
import type { AdminDb } from "@/lib/db/admin";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { sendTemplate, sendText, WaApiError, type WaConfig } from "./cloud";
import { decideSend, type SendDecision } from "./policy";

/**
 * The single outbound path (CLAUDE.md §4). Enforces opt-out, consent, the 24-hour
 * window and quiet hours via decideSend(), records every sent message, and logs
 * every attempt — allowed, blocked or failed.
 */
export type OutboundContent =
  | { kind: "text"; text: string }
  | { kind: "template"; name: string; language: "mr" | "hi" | "en"; params: string[]; category: "utility" | "marketing" | "authentication" };

export type SendRequest = {
  conversationId: string;
  leadId: string | null;
  content: OutboundContent;
  sender: "bot" | "coordinator" | "system";
  senderUserId?: string | null;
  isReplyToPatient?: boolean;
  isOptOutConfirmation?: boolean;
  now?: Date;
};

export type SendResult =
  | { status: "sent"; messageId: string; waMessageId: string }
  | { status: "blocked"; reason: Extract<SendDecision, { allow: false }>["reason"]; retryAt?: Date }
  | { status: "failed"; messageId: string; error: string; retryable: boolean };

export function waConfig(): WaConfig {
  const env = serverEnv();
  return { version: env.META_GRAPH_VERSION, phoneNumberId: env.WA_PHONE_NUMBER_ID, accessToken: env.WA_ACCESS_TOKEN };
}

const TEMPLATE_LANG: Record<"mr" | "hi" | "en", string> = { mr: "mr", hi: "hi", en: "en" };

export async function sendWhatsApp(db: AdminDb, req: SendRequest, cfg: WaConfig = waConfig()): Promise<SendResult> {
  const now = req.now ?? new Date();
  const { data: conv, error } = await db
    .from("conversations")
    .select("id, org_id, window_expires_at, patients!inner(id, phone_e164, opted_out_at, consent_whatsapp, deleted_at)")
    .eq("id", req.conversationId)
    .single();
  if (error || !conv) throw new Error(`conversation ${req.conversationId} not found`);
  const patient = conv.patients as unknown as {
    id: string; phone_e164: string; opted_out_at: string | null; consent_whatsapp: boolean; deleted_at: string | null;
  };
  const attemptLog = log.child({ conversationId: conv.id, leadId: req.leadId, sender: req.sender, kind: req.content.kind });

  if (patient.deleted_at) {
    attemptLog.warn("whatsapp.send.blocked", { reason: "opted_out", detail: "patient deleted" });
    return { status: "blocked", reason: "opted_out" };
  }

  const decision = decideSend({
    kind: req.content.kind,
    now,
    windowExpiresAt: conv.window_expires_at ? new Date(conv.window_expires_at) : null,
    optedOutAt: patient.opted_out_at ? new Date(patient.opted_out_at) : null,
    consentWhatsapp: patient.consent_whatsapp,
    templateCategory: req.content.kind === "template" ? req.content.category : undefined,
    isReplyToPatient: req.isReplyToPatient,
    isOptOutConfirmation: req.isOptOutConfirmation,
  });
  if (!decision.allow) {
    attemptLog.info("whatsapp.send.blocked", { reason: decision.reason, retryAt: decision.retryAt?.toISOString() });
    return { status: "blocked", reason: decision.reason, retryAt: decision.retryAt };
  }

  const body = req.content.kind === "text" ? req.content.text : `[template ${req.content.name}] ${req.content.params.join(" | ")}`;
  const { data: msg, error: insErr } = await db
    .from("messages")
    .insert({
      org_id: conv.org_id,
      conversation_id: conv.id,
      lead_id: req.leadId,
      direction: "out",
      sender: req.sender,
      sender_user_id: req.senderUserId ?? null,
      type: req.content.kind === "template" ? "template" : "text",
      body,
      template_name: req.content.kind === "template" ? req.content.name : null,
      status: "queued",
    })
    .select("id")
    .single();
  if (insErr || !msg) throw new Error(`could not record outbound message: ${insErr?.message}`);

  try {
    const waMessageId =
      req.content.kind === "text"
        ? await sendText(cfg, patient.phone_e164, req.content.text)
        : await sendTemplate(cfg, patient.phone_e164, req.content.name, TEMPLATE_LANG[req.content.language], req.content.params);
    await db.from("messages").update({ status: "sent", wa_message_id: waMessageId }).eq("id", msg.id);
    if (req.leadId) await db.from("leads").update({ last_outbound_at: now.toISOString() }).eq("id", req.leadId);
    attemptLog.info("whatsapp.send.sent", { messageId: msg.id });
    return { status: "sent", messageId: msg.id, waMessageId };
  } catch (e) {
    const err = e instanceof WaApiError ? e : new WaApiError(e instanceof Error ? e.message : String(e), 0);
    await db.from("messages").update({ status: "failed", error_code: String(err.code ?? err.status) }).eq("id", msg.id);
    const retryable = err.status === 0 || err.status >= 500 || err.status === 429;
    attemptLog.error("whatsapp.send.failed", { messageId: msg.id, status: err.status, code: err.code, error: err.message });
    return { status: "failed", messageId: msg.id, error: err.message, retryable };
  }
}
