import "server-only";
import type { AdminDb } from "@/lib/db/admin";
import type { GraphLead } from "@/lib/meta/graph";
import { mapLead, type FieldMapping } from "@/lib/meta/mapping";
import { pickCoordinator, type OrgSettings } from "./org";

export type UpsertedLead = {
  leadId: string;
  patientId: string;
  conversationId: string;
  orgId: string;
  created: boolean;
  consent: boolean;
  language: "mr" | "hi" | "en";
  fullName: string;
  assignedTo: string | null;
};

/** Idempotent on meta_leadgen_id: a retried or backfilled lead never creates a duplicate. */
export async function upsertMetaLead(
  db: AdminDb,
  org: { id: string; settings: OrgSettings },
  lead: GraphLead,
  waPhoneNumberId: string,
): Promise<UpsertedLead | { skipped: "invalid_phone" }> {
  const existing = await db.from("leads").select("id, patient_id, assigned_to").eq("meta_leadgen_id", lead.id).maybeSingle();
  const mapping: FieldMapping = (lead.form_id && org.settings.meta_field_mappings[lead.form_id]) || {};
  const m = mapLead(lead, mapping);
  if (!m.phoneE164) return { skipped: "invalid_phone" };

  // Patient by phone (unique per org). Consent is only ever upgraded, never silently removed.
  const now = new Date().toISOString();
  const { data: found } = await db.from("patients").select("*").eq("org_id", org.id).eq("phone_e164", m.phoneE164).maybeSingle();
  let patientId: string;
  if (found) {
    patientId = found.id;
    await db
      .from("patients")
      .update({
        full_name: found.full_name || m.fullName,
        district: found.district ?? m.district,
        taluka: found.taluka ?? m.taluka,
        age: found.age ?? m.age,
        ...(m.consentWhatsapp && !found.consent_whatsapp
          ? { consent_whatsapp: true, consent_at: now, consent_source: "meta_lead_form" }
          : {}),
      })
      .eq("id", found.id);
  } else {
    const { data: created, error } = await db
      .from("patients")
      .insert({
        org_id: org.id,
        full_name: m.fullName,
        phone_e164: m.phoneE164,
        age: m.age,
        district: m.district,
        taluka: m.taluka,
        preferred_language: m.language,
        consent_whatsapp: m.consentWhatsapp,
        consent_at: m.consentWhatsapp ? now : null,
        consent_source: m.consentWhatsapp ? "meta_lead_form" : null,
      })
      .select("id")
      .single();
    if (error || !created) throw new Error(`patient insert: ${error?.message}`);
    patientId = created.id;
  }

  const { data: conv, error: convErr } = await db
    .from("conversations")
    .upsert({ org_id: org.id, patient_id: patientId, wa_phone_number_id: waPhoneNumberId }, { onConflict: "patient_id,wa_phone_number_id" })
    .select("id")
    .single();
  if (convErr || !conv) throw new Error(`conversation upsert: ${convErr?.message}`);

  const { data: patient } = await db
    .from("patients")
    .select("consent_whatsapp, preferred_language, full_name")
    .eq("id", patientId)
    .single();
  const base = {
    patientId,
    conversationId: conv.id,
    orgId: org.id,
    consent: patient?.consent_whatsapp ?? false,
    language: patient?.preferred_language ?? m.language,
    fullName: patient?.full_name ?? m.fullName,
  };
  if (existing.data) return { ...base, leadId: existing.data.id, created: false, assignedTo: existing.data.assigned_to };

  let campaignId: string | null = null;
  if (lead.ad_id) {
    const { data: camp } = await db
      .from("campaigns")
      .upsert(
        {
          org_id: org.id,
          meta_ad_id: lead.ad_id,
          meta_adset_id: lead.adset_id ?? null,
          meta_campaign_id: lead.campaign_id ?? null,
          name: lead.campaign_name ?? lead.ad_name ?? "",
          treatment: m.treatment,
        },
        { onConflict: "org_id,meta_ad_id" },
      )
      .select("id")
      .single();
    campaignId = camp?.id ?? null;
  }

  const assignedTo = await pickCoordinator(db, org.id);
  const { data: inserted, error: leadErr } = await db
    .from("leads")
    .insert({
      org_id: org.id,
      patient_id: patientId,
      source: "meta_lead_ad",
      campaign_id: campaignId,
      meta_leadgen_id: lead.id,
      meta_form_id: lead.form_id ?? null,
      treatment: m.treatment,
      scheme: m.scheme,
      assigned_to: assignedTo,
      created_at: lead.created_time,
    })
    .select("id")
    .single();
  if (leadErr) {
    // Concurrent duplicate (webhook + backfill race): unique violation means it already exists.
    if (leadErr.code === "23505") {
      const again = await db.from("leads").select("id, assigned_to").eq("meta_leadgen_id", lead.id).single();
      return { ...base, leadId: again.data!.id, created: false, assignedTo: again.data!.assigned_to };
    }
    throw new Error(`lead insert: ${leadErr.message}`);
  }

  await db.from("consents").insert({
    org_id: org.id,
    patient_id: patientId,
    purpose: "whatsapp_contact",
    granted: m.consentWhatsapp,
    text_shown: org.settings.consent_text,
    source: `meta_lead_form:${lead.form_id ?? "unknown"}`,
  });

  const facts = [
    m.treatment && { key: "problem", value: m.treatment },
    m.age && { key: "age", value: String(m.age) },
    (m.district || m.taluka) && { key: "district", value: [m.taluka, m.district].filter(Boolean).join(", ") },
    m.hasSchemeCard && { key: "scheme_card", value: m.hasSchemeCard },
  ].filter((f): f is { key: string; value: string } => !!f);
  if (facts.length) {
    await db
      .from("lead_facts")
      .upsert(facts.map((f) => ({ ...f, lead_id: inserted.id, org_id: org.id, source: "form" as const, confidence: 1 })));
  }
  await db
    .from("stage_events")
    .insert({ org_id: org.id, lead_id: inserted.id, from_stage: null, to_stage: 0, actor_type: "system", reason: "Meta lead received" });

  return { ...base, leadId: inserted.id, created: true, assignedTo };
}
