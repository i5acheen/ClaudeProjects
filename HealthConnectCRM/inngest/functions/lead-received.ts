import { z } from "zod";
import { upsertMetaLead } from "@/lib/crm/leads";
import { resolveOrg } from "@/lib/crm/org";
import { adminDb } from "@/lib/db/admin";
import { metaEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { fetchLead } from "@/lib/meta/graph";
import { sendWhatsApp } from "@/lib/whatsapp/send";
import { EVENTS, inngest } from "../client";

const dataSchema = z.object({
  leadgenId: z.string(),
  pageId: z.string(),
  formId: z.string().optional(),
  webhookEventId: z.string().optional(),
});

/** Meta lead → patient + lead → greeting template (CLAUDE.md §6.1, §9). */
export const leadReceived = inngest.createFunction(
  { id: "lead-received", triggers: [{ event: EVENTS.leadReceived }], retries: 5, idempotency: "event.data.leadgenId" },
  async ({ event, step }) => {
    const data = dataSchema.parse(event.data);
    const env = metaEnv(); // a Meta lead can only arrive when Meta is configured
    const db = adminDb();

    const lead = await step.run("fetch-lead", () =>
      fetchLead({ version: env.META_GRAPH_VERSION, accessToken: env.META_PAGE_ACCESS_TOKEN }, data.leadgenId),
    );

    const result = await step.run("upsert-lead", async () => {
      const org = await resolveOrg(db, { metaPageId: data.pageId });
      return upsertMetaLead(db, org, lead, org.settings.wa_phone_number_id ?? process.env.WA_PHONE_NUMBER_ID ?? "whatsapp-not-configured");
    });

    if (data.webhookEventId) {
      await step.run("mark-processed", async () => {
        await db
          .from("webhook_events")
          .update({ processed_at: new Date().toISOString(), error: "skipped" in result ? result.skipped : null })
          .eq("id", data.webhookEventId!);
      });
    }
    if ("skipped" in result) {
      log.warn("lead.skipped", { leadgenId: data.leadgenId, reason: result.skipped });
      return result;
    }
    if (!result.created) return { leadId: result.leadId, duplicate: true };

    await step.sendEvent("lead-created", { name: EVENTS.leadCreated, data: { leadId: result.leadId, orgId: result.orgId } });

    if (!result.consent) {
      await step.run("no-consent-task", async () => {
        await db.from("tasks").insert({
          org_id: result.orgId,
          lead_id: result.leadId,
          assigned_to: result.assignedTo,
          type: "call",
          due_at: new Date().toISOString(),
        });
      });
      return { leadId: result.leadId, greeting: "skipped_no_consent" };
    }

    // Greeting; quiet hours → wait until 8 am IST and retry once.
    const greet = () =>
      sendWhatsApp(db, {
        conversationId: result.conversationId,
        leadId: result.leadId,
        sender: "system",
        content: {
          kind: "template",
          name: result.language === "hi" ? "lead_greeting_hi" : "lead_greeting_mr",
          language: result.language === "hi" ? "hi" : "mr",
          params: [result.fullName.split(" ")[0] || "जी"],
          category: "utility",
        },
      });
    let sent = await step.run("send-greeting", greet);
    if (sent.status === "blocked" && sent.reason === "quiet_hours" && sent.retryAt) {
      await step.sleepUntil("wait-quiet-hours", sent.retryAt);
      sent = await step.run("send-greeting-after-quiet-hours", greet);
    }
    if (sent.status === "failed" && sent.retryable) throw new Error(`greeting failed: ${sent.error}`);
    return { leadId: result.leadId, greeting: sent.status };
  },
);
