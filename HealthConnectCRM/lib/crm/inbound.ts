import "server-only";
import type { AdminDb } from "@/lib/db/admin";
import { fromWaId } from "@/lib/phone";
import { describeInbound, type WaInboundMessage } from "@/lib/whatsapp/webhook";
import { pickCoordinator, type OrgSettings } from "./org";

export type StoredInbound = {
  duplicate: boolean;
  orgId: string;
  patientId: string;
  conversationId: string;
  leadId: string;
  messageId: string;
  stage: number;
  newLead: boolean;
};

const WINDOW_MS = 24 * 3600_000;

/** Stores an inbound WhatsApp message; idempotent on wa_message_id. Creates patient/lead for first-time senders. */
export async function storeInbound(
  db: AdminDb,
  org: { id: string; settings: OrgSettings },
  phoneNumberId: string,
  msg: WaInboundMessage,
  profileName: string | undefined,
): Promise<StoredInbound | null> {
  const phone = fromWaId(msg.from);
  if (!phone) return null;
  const sentAt = new Date(Number(msg.timestamp) * 1000);
  const d = describeInbound(msg);

  let { data: patient } = await db.from("patients").select("id, deleted_at").eq("org_id", org.id).eq("phone_e164", phone).maybeSingle();
  if (!patient) {
    // Patient started the conversation: consent to reply on WhatsApp is implied for this enquiry and recorded.
    const { data: created, error } = await db
      .from("patients")
      .insert({ org_id: org.id, full_name: profileName ?? "", phone_e164: phone, consent_whatsapp: true, consent_at: sentAt.toISOString(), consent_source: "whatsapp_inbound" })
      .select("id, deleted_at")
      .single();
    if (error?.code === "23505") {
      patient = (await db.from("patients").select("id, deleted_at").eq("org_id", org.id).eq("phone_e164", phone).single()).data;
    } else if (error || !created) throw new Error(`patient insert: ${error?.message}`);
    else {
      patient = created;
      await db.from("consents").insert({
        org_id: org.id, patient_id: created.id, purpose: "whatsapp_contact", granted: true,
        text_shown: "Patient started the WhatsApp conversation.", source: "whatsapp_inbound",
      });
    }
  }
  if (!patient) throw new Error("patient not found after insert race");

  const { data: conv, error: convErr } = await db
    .from("conversations")
    .upsert({ org_id: org.id, patient_id: patient.id, wa_phone_number_id: phoneNumberId, status: "open" }, { onConflict: "patient_id,wa_phone_number_id" })
    .select("id, window_expires_at, unread_count")
    .single();
  if (convErr || !conv) throw new Error(`conversation upsert: ${convErr?.message}`);

  // Active lead = most recent not closed; otherwise open a new WhatsApp-sourced lead.
  let newLead = false;
  let { data: lead } = await db
    .from("leads")
    .select("id, stage")
    .eq("patient_id", patient.id)
    .is("closed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!lead) {
    const assignedTo = await pickCoordinator(db, org.id);
    const { data: created, error } = await db
      .from("leads")
      .insert({ org_id: org.id, patient_id: patient.id, source: "whatsapp", assigned_to: assignedTo })
      .select("id, stage")
      .single();
    if (error || !created) throw new Error(`lead insert: ${error?.message}`);
    await db.from("stage_events").insert({ org_id: org.id, lead_id: created.id, to_stage: 0, actor_type: "system", reason: "WhatsApp enquiry" });
    lead = created;
    newLead = true;
  }

  const { data: message, error: msgErr } = await db
    .from("messages")
    .insert({
      org_id: org.id,
      conversation_id: conv.id,
      lead_id: lead.id,
      direction: "in",
      sender: "patient",
      type: d.type,
      body: d.body,
      wa_media_id: d.mediaId,
      wa_message_id: msg.id,
      status: "received",
      created_at: sentAt.toISOString(),
    })
    .select("id")
    .single();
  if (msgErr?.code === "23505") {
    const existing = await db.from("messages").select("id").eq("wa_message_id", msg.id).single();
    return { duplicate: true, orgId: org.id, patientId: patient.id, conversationId: conv.id, leadId: lead.id, messageId: existing.data?.id ?? "", stage: lead.stage, newLead: false };
  }
  if (msgErr || !message) throw new Error(`message insert: ${msgErr?.message}`);

  const windowExpires = new Date(sentAt.getTime() + WINDOW_MS).toISOString();
  await db.from("conversations").update({ window_expires_at: windowExpires, unread_count: conv.unread_count + 1, status: "open" }).eq("id", conv.id);
  await db.from("leads").update({ last_inbound_at: sentAt.toISOString() }).eq("id", lead.id);

  return { duplicate: false, orgId: org.id, patientId: patient.id, conversationId: conv.id, leadId: lead.id, messageId: message.id, stage: lead.stage, newLead };
}
