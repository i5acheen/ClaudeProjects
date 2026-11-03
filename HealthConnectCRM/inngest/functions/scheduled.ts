import { z } from "zod";
import { parseOrgSettings } from "@/lib/crm/org";
import { adminDb } from "@/lib/db/admin";
import { checkEnv, metaEnv, waEnv } from "@/lib/env";
import { log } from "@/lib/log";
import { fetchFormLeadsSince, fetchPageForms } from "@/lib/meta/graph";
import { fetchWithTimeout } from "@/lib/utils";
import { EVENTS, inngest } from "../client";

/** Every 15 minutes: pull recent leads per form and enqueue any the webhook missed (CLAUDE.md §6.1). */
export const metaBackfill = inngest.createFunction(
  { id: "meta-backfill", triggers: [{ cron: "*/15 * * * *" }], concurrency: 1 },
  async ({ step }) => {
    if (checkEnv().meta.length) return { skipped: "Meta Lead Ads not configured" };
    const env = metaEnv();
    const cfg = { version: env.META_GRAPH_VERSION, accessToken: env.META_PAGE_ACCESS_TOKEN };
    const db = adminDb();
    const missing = await step.run("find-missing", async () => {
      const { data: orgs } = await db.from("orgs").select("settings");
      const out: { leadgenId: string; pageId: string; formId: string }[] = [];
      for (const o of orgs ?? []) {
        const s = parseOrgSettings(o.settings);
        const pageId = s.meta_page_id ?? env.META_PAGE_ID;
        const formIds = s.meta_form_ids.length
          ? s.meta_form_ids
          : (await fetchPageForms(cfg, pageId)).filter((f) => f.status !== "ARCHIVED").map((f) => f.id);
        const since = Math.floor(Date.now() / 1000) - 2 * 3600;
        for (const formId of formIds) {
          const leads = await fetchFormLeadsSince(cfg, formId, since);
          if (!leads.length) continue;
          const { data: known } = await db
            .from("leads")
            .select("meta_leadgen_id")
            .in(
              "meta_leadgen_id",
              leads.map((l) => l.id),
            );
          const have = new Set((known ?? []).map((k) => k.meta_leadgen_id));
          for (const l of leads) if (!have.has(l.id)) out.push({ leadgenId: l.id, pageId, formId });
        }
      }
      return out;
    });
    if (missing.length) {
      log.warn("meta.backfill.found_missing", { count: missing.length });
      await step.sendEvent(
        "enqueue-missing",
        missing.map((m) => ({ name: EVENTS.leadReceived, data: m })),
      );
    }
    return { enqueued: missing.length };
  },
);

const templateList = z.object({
  data: z.array(
    z.object({
      name: z.string(),
      language: z.string(),
      status: z.string(),
      category: z.string(),
      components: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
});

/** 02:00 IST nightly: template sync, raw webhook purge, retention (CLAUDE.md §9, §10). */
export const nightlyMaintenance = inngest.createFunction(
  { id: "nightly-maintenance", triggers: [{ cron: "TZ=Asia/Kolkata 0 2 * * *" }], concurrency: 1 },
  async ({ step }) => {
    const db = adminDb();

    const templates = await step.run("sync-templates", async () => {
      if (checkEnv().whatsapp.length) return "skipped: WhatsApp not configured";
      const env = waEnv();
      const res = await fetchWithTimeout(
        `https://graph.facebook.com/${env.META_GRAPH_VERSION}/${env.WA_BUSINESS_ACCOUNT_ID}/message_templates?limit=200`,
        { headers: { Authorization: `Bearer ${env.WA_ACCESS_TOKEN}` } },
      );
      if (!res.ok) throw new Error(`template sync ${res.status}`);
      const list = templateList.parse(await res.json()).data;
      const { data: orgs } = await db.from("orgs").select("id");
      const rows = (orgs ?? []).flatMap((o) =>
        list
          .filter((t) => ["mr", "hi", "en"].includes(t.language.slice(0, 2)))
          .map((t) => ({
            org_id: o.id,
            name: t.name,
            language: t.language.slice(0, 2) as "mr" | "hi" | "en",
            category: t.category.toLowerCase() as "utility" | "marketing" | "authentication",
            status: t.status,
            body_preview: t.components?.find((c) => c.type === "BODY")?.text ?? null,
          })),
      );
      if (rows.length) await db.from("wa_templates").upsert(rows, { onConflict: "org_id,name,language" });
      return rows.length;
    });

    const purged = await step.run("purge-webhook-events", async () => {
      const cutoff = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { count } = await db.from("webhook_events").delete({ count: "exact" }).lt("received_at", cutoff);
      return count ?? 0;
    });

    const retention = await step.run("retention", async () => {
      const { data: orgs } = await db.from("orgs").select("id, settings");
      let docs = 0;
      let anonymised = 0;
      for (const o of orgs ?? []) {
        const s = parseOrgSettings(o.settings);
        const docCutoff = new Date(Date.now() - s.retention.document_days * 86400_000).toISOString();
        const { data: closed } = await db.from("leads").select("id").eq("org_id", o.id).lt("closed_at", docCutoff);
        const leadIds = (closed ?? []).map((l) => l.id);
        if (leadIds.length) {
          const { data: oldDocs } = await db.from("documents").select("id, storage_path").in("lead_id", leadIds);
          if (oldDocs?.length) {
            const rm = await db.storage.from("documents").remove(oldDocs.map((d) => d.storage_path));
            if (rm.error) throw new Error(`storage remove: ${rm.error.message}`);
            await db
              .from("documents")
              .delete()
              .in(
                "id",
                oldDocs.map((d) => d.id),
              );
            docs += oldDocs.length;
          }
        }
        const anonCutoff = new Date(Date.now() - s.retention.anonymise_days * 86400_000).toISOString();
        const { data: stale } = await db.from("leads").select("patient_id").eq("org_id", o.id).lt("closed_at", anonCutoff);
        for (const pid of new Set((stale ?? []).map((l) => l.patient_id))) {
          const { count: open } = await db
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("patient_id", pid)
            .is("closed_at", null);
          const { data: p } = await db.from("patients").select("deleted_at").eq("id", pid).single();
          if ((open ?? 0) > 0 || p?.deleted_at) continue;
          const { data: paths, error } = await db.rpc("anonymise_patient", { p_patient_id: pid, p_reason: "retention policy" });
          if (error) throw new Error(`anonymise: ${error.message}`);
          if (paths?.length) await db.storage.from("documents").remove(paths);
          anonymised += 1;
        }
        await db
          .from("leads")
          .update({ archived_at: new Date().toISOString() })
          .eq("org_id", o.id)
          .eq("stage", 5)
          .is("archived_at", null)
          .lt("closed_at", docCutoff);
      }
      return { docs, anonymised };
    });

    return { templates, purged, retention };
  },
);
