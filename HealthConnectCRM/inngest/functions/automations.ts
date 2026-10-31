import { z } from "zod";
import { adminsOf, notify } from "@/lib/crm/org";
import { adminDb } from "@/lib/db/admin";
import { istHour } from "@/lib/utils";
import { sendWhatsApp } from "@/lib/whatsapp/send";
import { EVENTS, inngest } from "../client";

const leadEvent = z.object({ leadId: z.string(), orgId: z.string() });

async function leadState(leadId: string) {
  const db = adminDb();
  const { data } = await db
    .from("leads")
    .select("id, org_id, stage, assigned_to, needs_human, closed_at, patient_id, patients!inner(preferred_language, full_name), last_outbound_at")
    .eq("id", leadId)
    .single();
  return data;
}

async function conversationFor(patientId: string) {
  const { data } = await adminDb().from("conversations").select("id").eq("patient_id", patientId).limit(1).maybeSingle();
  return data?.id ?? null;
}

/** New lead: no reply in 2 h → coordinator call task; no reply in 24 h → docs_reminder once (CLAUDE.md §9). */
export const leadFollowups = inngest.createFunction(
  { id: "lead-followups", triggers: [{ event: EVENTS.leadCreated }], cancelOn: [{ event: EVENTS.patientReplied, match: "data.leadId" }] },
  async ({ event, step }) => {
    const { leadId, orgId } = leadEvent.parse(event.data);
    await step.sleep("wait-2h", "2h");

    await step.run("call-task", async () => {
      const lead = await leadState(leadId);
      if (!lead || lead.closed_at || lead.stage > 0) return "skip";
      // Before 8 pm IST: due now. Later: due at 9 am next day so nobody is asked to call at night.
      const now = new Date();
      const due = istHour(now) < 20 ? now : new Date(now.getTime() + (24 - istHour(now) + 9) * 3600_000 - now.getUTCMinutes() * 60_000);
      await adminDb().from("tasks").insert({ org_id: orgId, lead_id: leadId, assigned_to: lead.assigned_to, type: "call", due_at: due.toISOString() });
      if (lead.assigned_to) await notify(adminDb(), orgId, [lead.assigned_to], leadId, "call_lead", "No reply to greeting for 2 hours — please call.");
      return "task";
    });

    await step.sleep("wait-22h", "22h");
    return step.run("docs-reminder", async () => {
      const lead = await leadState(leadId);
      if (!lead || lead.closed_at || lead.stage > 0) return "skip";
      const conv = await conversationFor(lead.patient_id);
      if (!conv) return "no conversation";
      const lang = (lead.patients as unknown as { preferred_language: "mr" | "hi" | "en" }).preferred_language;
      const r = await sendWhatsApp(adminDb(), {
        conversationId: conv, leadId, sender: "system",
        content: { kind: "template", name: lang === "hi" ? "docs_reminder_hi" : "docs_reminder_mr", language: lang === "hi" ? "hi" : "mr", params: [], category: "utility" },
      });
      return r.status;
    });
  },
);

/** Docs pending: 24 h → reminder template; 72 h → chase_docs task (CLAUDE.md §9). */
export const docsPendingFollowups = inngest.createFunction(
  {
    id: "docs-pending-followups",
    triggers: [{ event: EVENTS.stageChanged, if: "event.data.toStage == 2" }],
    cancelOn: [{ event: EVENTS.stageChanged, match: "data.leadId", if: "async.data.toStage != 2" }],
  },
  async ({ event, step }) => {
    const { leadId, orgId } = leadEvent.parse(event.data);
    await step.sleep("wait-24h", "24h");
    await step.run("reminder", async () => {
      const lead = await leadState(leadId);
      if (!lead || lead.stage !== 2) return "skip";
      const conv = await conversationFor(lead.patient_id);
      if (!conv) return "no conversation";
      const lang = (lead.patients as unknown as { preferred_language: "mr" | "hi" | "en" }).preferred_language;
      return (await sendWhatsApp(adminDb(), {
        conversationId: conv, leadId, sender: "system",
        content: { kind: "template", name: lang === "hi" ? "docs_reminder_hi" : "docs_reminder_mr", language: lang === "hi" ? "hi" : "mr", params: [], category: "utility" },
      })).status;
    });
    await step.sleep("wait-48h", "48h");
    return step.run("chase-task", async () => {
      const lead = await leadState(leadId);
      if (!lead || lead.stage !== 2) return "skip";
      await adminDb().from("tasks").insert({ org_id: orgId, lead_id: leadId, assigned_to: lead.assigned_to, type: "chase_docs", due_at: new Date().toISOString() });
      return "task";
    });
  },
);

/** Needs human: notify assignee now (all staff for emergencies), escalate to admins after 30 min unanswered. */
export const needsHumanEscalation = inngest.createFunction(
  { id: "needs-human-escalation", triggers: [{ event: EVENTS.needsHuman }] },
  async ({ event, step }) => {
    const data = leadEvent.extend({ reason: z.string(), emergency: z.boolean().default(false) }).parse(event.data);
    const db = adminDb();
    await step.run("notify", async () => {
      const lead = await leadState(data.leadId);
      const targets = data.emergency || !lead?.assigned_to
        ? (await db.from("profiles").select("user_id").eq("org_id", data.orgId).in("role", ["admin", "coordinator"]).eq("is_active", true)).data?.map((p) => p.user_id) ?? []
        : [lead.assigned_to];
      await notify(db, data.orgId, targets, data.leadId, data.emergency ? "emergency" : "needs_human", data.emergency ? "EMERGENCY reported by patient — call now." : `Patient needs a coordinator (${data.reason}).`);
    });
    await step.sleep("wait-30m", "30m");
    return step.run("escalate", async () => {
      const { data: lead } = await db.from("leads").select("needs_human, needs_human_since").eq("id", data.leadId).single();
      if (!lead?.needs_human) return "resolved";
      const { count } = await db.from("messages").select("id", { count: "exact", head: true }).eq("lead_id", data.leadId).eq("sender", "coordinator").gte("created_at", lead.needs_human_since ?? new Date(0).toISOString());
      if ((count ?? 0) > 0) return "answered";
      await notify(db, data.orgId, await adminsOf(db, data.orgId), data.leadId, "escalation", "Patient waiting for a coordinator for 30+ minutes.");
      return "escalated";
    });
  },
);
