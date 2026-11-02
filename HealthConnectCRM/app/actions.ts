"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { EVENTS, inngest } from "@/inngest/client";
import { audit } from "@/lib/audit";
import { resetDemoData } from "@/lib/demo/client";
import { DEMO_ROLE_COOKIE, isDemo, parseDemoRole } from "@/lib/demo/mode";
import { assertRole } from "@/lib/auth/session";
import { adminDb } from "@/lib/db/admin";
import { userDb } from "@/lib/db/server";
import type { Json } from "@/lib/db/types";
import { fieldMappingSchema } from "@/lib/meta/mapping";
import { toE164 } from "@/lib/phone";
import { sendWhatsApp } from "@/lib/whatsapp/send";

/**
 * Every mutation: zod-validate input, check the role on the server, act through the
 * user's RLS-scoped client wherever possible. Server Actions carry Next.js's built-in
 * Origin check (CSRF protection for mutations, CLAUDE.md §10).
 */
type Result = { ok: true } | { ok: false; error: string };
const uuid = z.string().uuid();

function fail(e: unknown): Result {
  return { ok: false, error: e instanceof Error ? e.message : String(e) };
}

export async function setLocale(locale: "en" | "mr") {
  (await cookies()).set("locale", locale === "mr" ? "mr" : "en", { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function signOut() {
  await (await userDb()).auth.signOut();
  (await cookies()).delete(DEMO_ROLE_COOKIE);
  redirect("/login");
}

/** Prototype only: enter the demo as one of the four roles. */
export async function enterDemo(role: string) {
  const r = parseDemoRole(role);
  if (!isDemo() || !r) redirect("/login");
  (await cookies()).set(DEMO_ROLE_COOKIE, r, { path: "/", maxAge: 12 * 3600, sameSite: "lax", httpOnly: true });
  redirect(r === "hospital_partner" ? "/portal" : "/dashboard");
}

/** Prototype only: restore the sample data. */
export async function resetDemo(): Promise<void> {
  if (!isDemo()) return;
  resetDemoData();
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export async function moveStage(input: { leadId: string; toStage: number; reason?: string; admittedAt?: string }): Promise<Result> {
  try {
    const p = z
      .object({
        leadId: uuid,
        toStage: z.number().int().min(-1).max(5),
        reason: z.string().max(500).optional(),
        admittedAt: z.string().datetime({ offset: true }).optional(),
      })
      .parse(input);
    const s = await assertRole("admin", "coordinator", "hospital_partner");
    const db = await userDb();
    const { error } = await db.rpc("move_lead_stage", {
      p_lead_id: p.leadId,
      p_to_stage: p.toStage,
      p_reason: p.reason,
      p_admitted_at: p.admittedAt,
    });
    if (error) return { ok: false, error: error.message };
    await inngest
      .send({ name: EVENTS.stageChanged, data: { leadId: p.leadId, orgId: s.profile.org_id, toStage: p.toStage } })
      .catch(() => undefined);
    revalidatePath("/pipeline");
    revalidatePath(`/leads/${p.leadId}`);
    revalidatePath("/portal");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createLead(input: {
  fullName: string;
  phone: string;
  treatment?: string;
  district?: string;
}): Promise<Result & { leadId?: string }> {
  try {
    const p = z
      .object({
        fullName: z.string().min(1).max(120),
        phone: z.string().min(6).max(20),
        treatment: z.string().max(80).optional(),
        district: z.string().max(80).optional(),
      })
      .parse(input);
    const s = await assertRole("admin", "coordinator");
    const phone = toE164(p.phone);
    if (!phone) return { ok: false, error: "Invalid phone number" };
    const db = await userDb();
    const org = s.profile.org_id;
    let { data: patient } = await db.from("patients").select("id").eq("org_id", org).eq("phone_e164", phone).maybeSingle();
    if (!patient) {
      const { data, error } = await db
        .from("patients")
        .insert({ org_id: org, full_name: p.fullName, phone_e164: phone, district: p.district ?? null })
        .select("id")
        .single();
      if (error) return { ok: false, error: error.message };
      patient = data;
    }
    const { data: lead, error } = await db
      .from("leads")
      .insert({ org_id: org, patient_id: patient.id, source: "manual", treatment: p.treatment ?? null, assigned_to: s.userId })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    await audit("lead.created", "leads", lead.id, undefined, { source: "manual" });
    revalidatePath("/pipeline");
    return { ok: true, leadId: lead.id };
  } catch (e) {
    return fail(e);
  }
}

export async function updateLead(input: {
  leadId: string;
  hospitalId?: string | null;
  visitAt?: string | null;
  assignedTo?: string | null;
  botEnabled?: boolean;
  needsHuman?: boolean;
}): Promise<Result> {
  try {
    const p = z
      .object({
        leadId: uuid,
        hospitalId: uuid.nullable().optional(),
        visitAt: z.string().datetime({ offset: true }).nullable().optional(),
        assignedTo: uuid.nullable().optional(),
        botEnabled: z.boolean().optional(),
        needsHuman: z.boolean().optional(),
      })
      .parse(input);
    await assertRole("admin", "coordinator");
    const db = await userDb();
    const { data: before } = await db
      .from("leads")
      .select("hospital_id, visit_at, assigned_to, bot_enabled, needs_human")
      .eq("id", p.leadId)
      .single();
    if (!before) return { ok: false, error: "Lead not found" };
    const patch = {
      ...(p.hospitalId !== undefined && { hospital_id: p.hospitalId }),
      ...(p.visitAt !== undefined && { visit_at: p.visitAt }),
      ...(p.assignedTo !== undefined && { assigned_to: p.assignedTo }),
      ...(p.botEnabled !== undefined && { bot_enabled: p.botEnabled }),
      ...(p.needsHuman !== undefined && { needs_human: p.needsHuman, needs_human_since: p.needsHuman ? new Date().toISOString() : null }),
    };
    const { error } = await db.from("leads").update(patch).eq("id", p.leadId);
    if (error) return { ok: false, error: error.message };
    await audit("lead.updated", "leads", p.leadId, before as Json, patch as Json);
    revalidatePath(`/leads/${p.leadId}`);
    revalidatePath("/inbox");
    revalidatePath("/pipeline");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Coordinator takes over: bot off for this lead, assigned to them, no longer waiting. */
export async function takeOver(leadId: string): Promise<Result> {
  const s = await assertRole("admin", "coordinator");
  return updateLead({ leadId, botEnabled: false, needsHuman: false, assignedTo: s.userId });
}

export async function addNote(input: { leadId: string; body: string }): Promise<Result> {
  try {
    const p = z.object({ leadId: uuid, body: z.string().trim().min(1).max(5000) }).parse(input);
    const s = await assertRole("admin", "coordinator");
    const { error } = await (
      await userDb()
    )
      .from("notes")
      .insert({ org_id: s.profile.org_id, lead_id: p.leadId, author_id: s.userId, body: p.body });
    if (error) return { ok: false, error: error.message };
    revalidatePath(`/leads/${p.leadId}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function completeTask(taskId: string): Promise<Result> {
  try {
    uuid.parse(taskId);
    await assertRole("admin", "coordinator");
    const { error } = await (await userDb()).from("tasks").update({ done_at: new Date().toISOString() }).eq("id", taskId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/tasks");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Documents: 60-second signed URLs, every view audited (CLAUDE.md §10)
// ---------------------------------------------------------------------------
export async function documentUrl(documentId: string): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  try {
    uuid.parse(documentId);
    await assertRole("admin", "coordinator");
    const db = await userDb();
    const { data: doc } = await db.from("documents").select("id, storage_path, kind").eq("id", documentId).single();
    if (!doc) return { ok: false, error: "Not found" };
    const { data, error } = await db.storage.from("documents").createSignedUrl(doc.storage_path, 60);
    if (error || !data) return { ok: false, error: error?.message ?? "Could not sign URL" };
    await audit("document.viewed", "documents", doc.id, undefined, { kind: doc.kind });
    return { ok: true, url: data.signedUrl };
  } catch (e) {
    return fail(e) as { ok: false; error: string };
  }
}

export async function verifyDocument(input: { documentId: string; kind: string }): Promise<Result> {
  try {
    const p = z
      .object({ documentId: uuid, kind: z.enum(["aadhaar", "ration_card", "scheme_card", "prescription", "report", "other"]) })
      .parse(input);
    const s = await assertRole("admin", "coordinator");
    const db = await userDb();
    const { data: doc, error } = await db
      .from("documents")
      .update({ kind: p.kind, verified_by: s.userId, verified_at: new Date().toISOString() })
      .eq("id", p.documentId)
      .select("lead_id")
      .single();
    if (error) return { ok: false, error: error.message };
    await audit("document.verified", "documents", p.documentId, undefined, { kind: p.kind });
    if (doc?.lead_id) revalidatePath(`/leads/${doc.lead_id}`);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Messaging (goes through lib/whatsapp/send.ts after an RLS access check)
// ---------------------------------------------------------------------------
export async function sendReply(input: {
  conversationId: string;
  leadId: string | null;
  text: string;
  internalNote?: boolean;
}): Promise<Result> {
  try {
    const p = z
      .object({
        conversationId: uuid,
        leadId: uuid.nullable(),
        text: z.string().trim().min(1).max(4000),
        internalNote: z.boolean().optional(),
      })
      .parse(input);
    const s = await assertRole("admin", "coordinator");
    const db = await userDb();
    const { data: conv } = await db.from("conversations").select("id, org_id").eq("id", p.conversationId).single();
    if (!conv) return { ok: false, error: "Conversation not found" };
    if (p.internalNote) {
      const { error } = await db.from("messages").insert({
        org_id: conv.org_id,
        conversation_id: conv.id,
        lead_id: p.leadId,
        direction: "out",
        sender: "coordinator",
        sender_user_id: s.userId,
        type: "text",
        body: p.text,
        is_internal_note: true,
        status: "sent",
      });
      if (error) return { ok: false, error: error.message };
    } else {
      const r = await sendWhatsApp(adminDb(), {
        conversationId: conv.id,
        leadId: p.leadId,
        sender: "coordinator",
        senderUserId: s.userId,
        isReplyToPatient: true,
        content: { kind: "text", text: p.text },
      });
      if (r.status === "blocked") return { ok: false, error: `blocked: ${r.reason}` };
      if (r.status === "failed") return { ok: false, error: r.error };
      if (p.leadId) await db.from("leads").update({ needs_human: false, needs_human_since: null }).eq("id", p.leadId);
      await db.from("conversations").update({ unread_count: 0 }).eq("id", conv.id);
    }
    revalidatePath("/inbox");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sendTemplate(input: {
  conversationId: string;
  leadId: string | null;
  templateId: string;
  params: string[];
}): Promise<Result> {
  try {
    const p = z
      .object({ conversationId: uuid, leadId: uuid.nullable(), templateId: uuid, params: z.array(z.string().max(200)).max(10) })
      .parse(input);
    const s = await assertRole("admin", "coordinator");
    const db = await userDb();
    const [{ data: conv }, { data: tpl }] = await Promise.all([
      db.from("conversations").select("id").eq("id", p.conversationId).single(),
      db.from("wa_templates").select("name, language, category, status, is_enabled").eq("id", p.templateId).single(),
    ]);
    if (!conv || !tpl) return { ok: false, error: "Not found" };
    if (tpl.status !== "APPROVED" || !tpl.is_enabled) return { ok: false, error: "Template not approved or disabled" };
    const r = await sendWhatsApp(adminDb(), {
      conversationId: conv.id,
      leadId: p.leadId,
      sender: "coordinator",
      senderUserId: s.userId,
      content: { kind: "template", name: tpl.name, language: tpl.language, params: p.params, category: tpl.category },
    });
    if (r.status !== "sent") return { ok: false, error: r.status === "blocked" ? `blocked: ${r.reason}` : r.error };
    revalidatePath("/inbox");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Admin: settings, KB, hospitals, users
// ---------------------------------------------------------------------------
const settingsInput = z.object({
  botEnabled: z.boolean(),
  documentDays: z.number().int().min(7).max(3650),
  anonymiseDays: z.number().int().min(30).max(3650),
  fieldMappings: z.record(z.string(), fieldMappingSchema).optional(),
  metaFormIds: z.array(z.string()).optional(),
});

export async function saveSettings(input: z.infer<typeof settingsInput>): Promise<Result> {
  try {
    const p = settingsInput.parse(input);
    const s = await assertRole("admin");
    const db = await userDb();
    const { data: org } = await db.from("orgs").select("settings").eq("id", s.profile.org_id).single();
    const before = (org?.settings ?? {}) as Record<string, Json>;
    const bot = (before.bot ?? {}) as Record<string, Json>;
    const after: Record<string, Json> = {
      ...before,
      bot: { ...bot, enabled: p.botEnabled },
      retention: { document_days: p.documentDays, anonymise_days: p.anonymiseDays },
      ...(p.fieldMappings && { meta_field_mappings: p.fieldMappings }),
      ...(p.metaFormIds && { meta_form_ids: p.metaFormIds }),
    };
    const { error } = await db.from("orgs").update({ settings: after }).eq("id", s.profile.org_id);
    if (error) return { ok: false, error: error.message };
    await audit(
      bot.enabled !== p.botEnabled ? (p.botEnabled ? "bot.global_enable" : "bot.global_disable") : "settings.updated",
      "orgs",
      s.profile.org_id,
      before,
      after,
    );
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveKbArticle(input: {
  id?: string;
  title: string;
  body: string;
  language: "mr" | "hi" | "en";
  isPublished: boolean;
}): Promise<Result> {
  try {
    const p = z
      .object({
        id: uuid.optional(),
        title: z.string().min(1).max(200),
        body: z.string().min(1).max(5000),
        language: z.enum(["mr", "hi", "en"]),
        isPublished: z.boolean(),
      })
      .parse(input);
    const s = await assertRole("admin");
    const db = await userDb();
    const row = { org_id: s.profile.org_id, title: p.title, body: p.body, language: p.language, is_published: p.isPublished };
    const { error } = p.id ? await db.from("kb_articles").update(row).eq("id", p.id) : await db.from("kb_articles").insert(row);
    if (error) return { ok: false, error: error.message };
    await audit("kb.saved", "kb_articles", p.id ?? null, undefined, { title: p.title });
    revalidatePath("/settings");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveHospital(input: {
  id?: string;
  name: string;
  district?: string;
  address?: string;
  schemes: string[];
  specialties: string[];
  contactName?: string;
  contactPhone?: string;
  isActive: boolean;
}): Promise<Result> {
  try {
    const p = z
      .object({
        id: uuid.optional(),
        name: z.string().min(1).max(200),
        district: z.string().max(80).optional(),
        address: z.string().max(300).optional(),
        schemes: z.array(z.enum(["MJPJAY", "PM-JAY"])),
        specialties: z.array(z.string().max(60)).max(20),
        contactName: z.string().max(120).optional(),
        contactPhone: z.string().max(20).optional(),
        isActive: z.boolean(),
      })
      .parse(input);
    const s = await assertRole("admin");
    const db = await userDb();
    const row = {
      org_id: s.profile.org_id,
      name: p.name,
      district: p.district ?? null,
      address: p.address ?? null,
      empanelled_schemes: p.schemes,
      specialties: p.specialties,
      contact_name: p.contactName ?? null,
      contact_phone: p.contactPhone ?? null,
      is_active: p.isActive,
    };
    const { error } = p.id ? await db.from("hospitals").update(row).eq("id", p.id) : await db.from("hospitals").insert(row);
    if (error) return { ok: false, error: error.message };
    await audit("hospital.saved", "hospitals", p.id ?? null, undefined, { name: p.name });
    revalidatePath("/hospitals");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Creates the auth user with org/role in app_metadata (not user-editable); the DB trigger creates the profile. */
export async function inviteUser(input: {
  email: string;
  fullName: string;
  role: "admin" | "coordinator" | "hospital_partner" | "viewer";
  hospitalId?: string;
}): Promise<Result> {
  try {
    const p = z
      .object({
        email: z.string().email(),
        fullName: z.string().min(1).max(120),
        role: z.enum(["admin", "coordinator", "hospital_partner", "viewer"]),
        hospitalId: uuid.optional(),
      })
      .parse(input);
    if (p.role === "hospital_partner" && !p.hospitalId) return { ok: false, error: "Hospital partners need a hospital" };
    const s = await assertRole("admin");
    if (p.hospitalId) {
      const { data: h } = await (await userDb()).from("hospitals").select("id").eq("id", p.hospitalId).single();
      if (!h) return { ok: false, error: "Hospital not found" };
    }
    const { error } = await adminDb().auth.admin.createUser({
      email: p.email,
      email_confirm: true,
      app_metadata: { org_id: s.profile.org_id, role: p.role, hospital_id: p.hospitalId ?? null, full_name: p.fullName },
    });
    if (error) return { ok: false, error: error.message };
    await audit("user.invited", "profiles", p.email, undefined, { role: p.role });
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function updateUser(input: {
  userId: string;
  role: "admin" | "coordinator" | "hospital_partner" | "viewer";
  hospitalId: string | null;
  isActive: boolean;
}): Promise<Result> {
  try {
    const p = z
      .object({
        userId: uuid,
        role: z.enum(["admin", "coordinator", "hospital_partner", "viewer"]),
        hospitalId: uuid.nullable(),
        isActive: z.boolean(),
      })
      .parse(input);
    await assertRole("admin");
    // RLS limits this to the admin's org; the profiles trigger writes the audit row.
    const { error } = await (
      await userDb()
    )
      .from("profiles")
      .update({ role: p.role, hospital_id: p.role === "hospital_partner" ? p.hospitalId : null, is_active: p.isActive })
      .eq("user_id", p.userId);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

// ---------------------------------------------------------------------------
// Privacy tools (§8.10) — functions audit themselves.
// ---------------------------------------------------------------------------
export async function exportPatient(patientId: string): Promise<{ ok: true; data: Json } | { ok: false; error: string }> {
  try {
    uuid.parse(patientId);
    await assertRole("admin");
    const { data, error } = await (await userDb()).rpc("export_patient", { p_patient_id: patientId });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: data as Json };
  } catch (e) {
    return fail(e) as { ok: false; error: string };
  }
}

export async function anonymisePatient(input: { patientId: string; reason: string; confirm: string }): Promise<Result> {
  try {
    const p = z.object({ patientId: uuid, reason: z.string().min(3).max(300), confirm: z.literal("DELETE") }).parse(input);
    await assertRole("admin");
    const { data: paths, error } = await (await userDb()).rpc("anonymise_patient", { p_patient_id: p.patientId, p_reason: p.reason });
    if (error) return { ok: false, error: error.message };
    if (paths?.length) {
      const rm = await adminDb().storage.from("documents").remove(paths);
      if (rm.error) return { ok: false, error: `data anonymised but file removal failed: ${rm.error.message}` };
    }
    revalidatePath("/privacy");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function markAlertsRead(): Promise<void> {
  const s = await assertRole("admin", "coordinator");
  await (await userDb()).from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", s.userId).is("read_at", null);
  revalidatePath("/alerts");
}
