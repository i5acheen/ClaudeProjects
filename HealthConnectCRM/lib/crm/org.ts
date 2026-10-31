import "server-only";
import { z } from "zod";
import type { AdminDb } from "@/lib/db/admin";
import { fieldMappingSchema } from "@/lib/meta/mapping";

/** Typed view of orgs.settings (admin-editable in Settings). */
export const orgSettingsSchema = z
  .object({
    bot: z.object({ enabled: z.boolean().default(true), working_hours: z.object({ start: z.number(), end: z.number() }).optional() }).default({ enabled: true }),
    meta_page_id: z.string().optional(),
    meta_form_ids: z.array(z.string()).default([]),
    meta_field_mappings: z.record(z.string(), fieldMappingSchema).default({}),
    wa_phone_number_id: z.string().optional(),
    consent_text: z.string().default("I agree to be contacted on WhatsApp about my treatment enquiry. (Meta lead form consent checkbox)"),
    retention: z.object({ document_days: z.number().int().min(1).default(90), anonymise_days: z.number().int().min(1).default(365) }).default({ document_days: 90, anonymise_days: 365 }),
    sla_minutes: z.object({ uncontacted: z.number().default(15), needs_human_escalation: z.number().default(30) }).default({ uncontacted: 15, needs_human_escalation: 30 }),
  })
  .passthrough();
export type OrgSettings = z.infer<typeof orgSettingsSchema>;

export function parseOrgSettings(raw: unknown): OrgSettings {
  return orgSettingsSchema.parse(raw ?? {});
}

/** Resolve the org that owns a Meta page or WhatsApp number. Falls back to the only org when there is one. */
export async function resolveOrg(db: AdminDb, by: { metaPageId?: string; waPhoneNumberId?: string }): Promise<{ id: string; settings: OrgSettings }> {
  const { data, error } = await db.from("orgs").select("id, settings");
  if (error) throw new Error(`orgs: ${error.message}`);
  const orgs = (data ?? []).map((o) => ({ id: o.id, settings: parseOrgSettings(o.settings) }));
  const match = orgs.find(
    (o) => (by.metaPageId && o.settings.meta_page_id === by.metaPageId) || (by.waPhoneNumberId && o.settings.wa_phone_number_id === by.waPhoneNumberId),
  );
  if (match) return match;
  if (orgs.length === 1) return orgs[0];
  throw new Error("cannot resolve org for inbound event");
}

/** Round-robin: the active coordinator with the fewest leads assigned in the last 24 h (ties: least recently assigned). */
export async function pickCoordinator(db: AdminDb, orgId: string): Promise<string | null> {
  const { data: coords } = await db.from("profiles").select("user_id").eq("org_id", orgId).eq("role", "coordinator").eq("is_active", true);
  if (!coords?.length) return null;
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data: recent } = await db.from("leads").select("assigned_to, created_at").eq("org_id", orgId).gte("created_at", since).not("assigned_to", "is", null);
  const load = new Map<string, { n: number; last: string }>(coords.map((c) => [c.user_id, { n: 0, last: "" }]));
  for (const l of recent ?? []) {
    const e = l.assigned_to ? load.get(l.assigned_to) : undefined;
    if (e) {
      e.n += 1;
      if (l.created_at > e.last) e.last = l.created_at;
    }
  }
  return [...load.entries()].sort((a, b) => a[1].n - b[1].n || a[1].last.localeCompare(b[1].last))[0][0];
}

export async function notify(db: AdminDb, orgId: string, userIds: string[], leadId: string | null, kind: string, body: string): Promise<void> {
  if (!userIds.length) return;
  await db.from("notifications").insert(userIds.map((user_id) => ({ org_id: orgId, user_id, lead_id: leadId, kind, body })));
}

export async function adminsOf(db: AdminDb, orgId: string): Promise<string[]> {
  const { data } = await db.from("profiles").select("user_id").eq("org_id", orgId).eq("role", "admin").eq("is_active", true);
  return (data ?? []).map((p) => p.user_id);
}

export async function staffOf(db: AdminDb, orgId: string): Promise<string[]> {
  const { data } = await db.from("profiles").select("user_id").eq("org_id", orgId).in("role", ["admin", "coordinator"]).eq("is_active", true);
  return (data ?? []).map((p) => p.user_id);
}
