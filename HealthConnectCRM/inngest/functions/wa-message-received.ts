import { z } from "zod";
import { runBotTurn, type HistoryMessage } from "@/lib/ai/bot";
import { aiProvider } from "@/lib/ai";
import { storeInbound } from "@/lib/crm/inbound";
import { notify, resolveOrg, staffOf } from "@/lib/crm/org";
import { adminDb } from "@/lib/db/admin";
import { log } from "@/lib/log";
import { downloadMedia, markRead } from "@/lib/whatsapp/cloud";
import { isOptIn, isOptOut, OPT_OUT_CONFIRMATION } from "@/lib/whatsapp/optout";
import { sendWhatsApp, waConfig } from "@/lib/whatsapp/send";
import { describeInbound, waInboundMessageSchema } from "@/lib/whatsapp/webhook";
import { EVENTS, inngest } from "../client";

const dataSchema = z.object({
  webhookEventId: z.string().optional(),
  phoneNumberId: z.string(),
  profileName: z.string().optional(),
  message: waInboundMessageSchema,
});

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Inbound WhatsApp → store → opt-out / media → bot turn (CLAUDE.md §6.2, §7). One at a time per sender. */
export const waMessageReceived = inngest.createFunction(
  {
    id: "wa-message-received",
    triggers: [{ event: EVENTS.waMessage }],
    retries: 4,
    idempotency: "event.data.message.id",
    concurrency: [{ limit: 1, key: "event.data.message.from" }],
  },
  async ({ event, step }) => {
    const data = dataSchema.parse(event.data);
    const db = adminDb();
    const inbound = describeInbound(data.message);

    const stored = await step.run("store", async () => {
      const org = await resolveOrg(db, { waPhoneNumberId: data.phoneNumberId });
      const s = await storeInbound(db, org, data.phoneNumberId, data.message, data.profileName);
      if (data.webhookEventId)
        await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", data.webhookEventId);
      return s ? { ...s, botGloballyEnabled: org.settings.bot.enabled } : null;
    });
    if (!stored || stored.duplicate) return { skipped: stored ? "duplicate" : "invalid_sender" };

    await step.sendEvent("patient-replied", { name: EVENTS.patientReplied, data: { leadId: stored.leadId } });
    if (stored.newLead)
      await step.sendEvent("lead-created", { name: EVENTS.leadCreated, data: { leadId: stored.leadId, orgId: stored.orgId } });

    // Opt-out / opt-in (CLAUDE.md §6.2): honoured before anything else.
    if (isOptOut(inbound.body)) {
      await step.run("opt-out", async () => {
        const { data: p } = await db.from("patients").select("preferred_language, opted_out_at").eq("id", stored.patientId).single();
        if (p?.opted_out_at) return;
        await db.from("patients").update({ opted_out_at: new Date().toISOString() }).eq("id", stored.patientId);
        await db.from("consents").insert({
          org_id: stored.orgId,
          patient_id: stored.patientId,
          purpose: "whatsapp_contact",
          granted: false,
          text_shown: inbound.body ?? "STOP",
          source: "whatsapp_opt_out",
        });
        await db.from("leads").update({ bot_enabled: false }).eq("id", stored.leadId);
        await sendWhatsApp(db, {
          conversationId: stored.conversationId,
          leadId: stored.leadId,
          sender: "system",
          isOptOutConfirmation: true,
          content: { kind: "text", text: OPT_OUT_CONFIRMATION[p?.preferred_language ?? "mr"] },
        });
      });
      return { optedOut: true };
    }
    if (isOptIn(inbound.body)) {
      await step.run("opt-in", async () => {
        await db.from("patients").update({ opted_out_at: null }).eq("id", stored.patientId);
        await db.from("consents").insert({
          org_id: stored.orgId,
          patient_id: stored.patientId,
          purpose: "whatsapp_contact",
          granted: true,
          text_shown: inbound.body ?? "START",
          source: "whatsapp_opt_in",
        });
      });
    }

    // Contacted: the patient replied.
    if (stored.stage === 0) {
      await step.run("mark-contacted", async () => {
        await db.rpc("move_lead_stage", {
          p_lead_id: stored.leadId,
          p_to_stage: 1,
          p_reason: "patient replied on WhatsApp",
          p_actor: "system",
        });
      });
    }

    // Media → private bucket → documents.
    let documentId: string | null = null;
    if (inbound.mediaId && (inbound.type === "image" || inbound.type === "document")) {
      documentId = await step.run("store-media", async () => {
        const media = await downloadMedia(waConfig(), inbound.mediaId!);
        const ext = EXT[media.mimeType];
        if (!ext) return null;
        const id = crypto.randomUUID();
        const path = `${stored.orgId}/${stored.patientId}/${id}.${ext}`;
        const up = await db.storage.from("documents").upload(path, media.bytes, { contentType: media.mimeType, upsert: false });
        if (up.error) throw new Error(`storage upload: ${up.error.message}`);
        const { error } = await db.from("documents").insert({
          id,
          org_id: stored.orgId,
          patient_id: stored.patientId,
          lead_id: stored.leadId,
          kind: "other",
          storage_path: path,
          mime_type: media.mimeType,
          size_bytes: media.size,
        });
        if (error) throw new Error(`document insert: ${error.message}`);
        await db.from("messages").update({ media_id: id }).eq("id", stored.messageId);
        return id;
      });
    }

    // Bot gate: global switch, per-lead switch, waiting for a human, opted out.
    const gate = await step.run("bot-gate", async () => {
      const { data: lead } = await db.from("leads").select("bot_enabled, needs_human, stage, assigned_to").eq("id", stored.leadId).single();
      const { data: patient } = await db.from("patients").select("opted_out_at, preferred_language").eq("id", stored.patientId).single();
      const open = !!lead && stored.botGloballyEnabled && lead.bot_enabled && !lead.needs_human && !patient?.opted_out_at;
      return { open, stage: lead?.stage ?? 0, assignedTo: lead?.assigned_to ?? null, language: patient?.preferred_language ?? "mr" };
    });
    if (!gate.open) {
      await step.run("notify-staff-bot-off", async () => {
        const targets = gate.assignedTo ? [gate.assignedTo] : await staffOf(db, stored.orgId);
        await notify(db, stored.orgId, targets, stored.leadId, "inbound_message", "New WhatsApp message (bot not replying)");
      });
      return { bot: "off" };
    }

    const decision = await step.run("bot-turn", async () => {
      const [{ data: history }, { data: facts }, { data: kb }, { data: runs }] = await Promise.all([
        db
          .from("messages")
          .select("direction, body, type, created_at")
          .eq("conversation_id", stored.conversationId)
          .eq("is_internal_note", false)
          .neq("id", stored.messageId)
          .order("created_at", { ascending: false })
          .limit(16),
        db.from("lead_facts").select("key, value").eq("lead_id", stored.leadId),
        db.from("kb_articles").select("title, body").eq("org_id", stored.orgId).eq("is_published", true).limit(20),
        db
          .from("bot_runs")
          .select("output, guardrail_flags")
          .eq("lead_id", stored.leadId)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const knownFacts = Object.fromEntries((facts ?? []).filter((f) => f.key !== "aadhaar_number").map((f) => [f.key, f.value]));
      // "No progress" = consecutive recent bot runs that produced no new facts and no stage proposal.
      let noProgress = 0;
      for (const r of runs ?? []) {
        const out = r.output as { proposed_stage?: number } | null;
        if (out && typeof out.proposed_stage === "number" && out.proposed_stage <= gate.stage) noProgress += 1;
        else break;
      }
      return runBotTurn(aiProvider(), {
        inbound: { type: inbound.type, body: inbound.body },
        history: ((history ?? []) as HistoryMessage[]).reverse(),
        knownFacts,
        currentStage: gate.stage,
        preferredLanguage: gate.language,
        botTurnsWithoutProgress: noProgress,
        kb: kb ?? [],
      });
    });

    // Rules-only mode (AI off) and nothing matched: leave it for a coordinator.
    if (decision.kind === "no_bot") {
      await step.run("notify-staff-no-bot", async () => {
        const targets = gate.assignedTo ? [gate.assignedTo] : await staffOf(db, stored.orgId);
        await notify(db, stored.orgId, targets, stored.leadId, "inbound_message", "New WhatsApp message — please reply");
      });
      return { kind: "no_bot" };
    }

    await step.run("apply-decision", async () => {
      await db.from("bot_runs").insert({
        org_id: stored.orgId,
        lead_id: stored.leadId,
        input_message_id: stored.messageId,
        model: decision.run.model,
        prompt_version: decision.run.promptVersion,
        latency_ms: decision.run.latencyMs,
        input_tokens: decision.run.inputTokens,
        output_tokens: decision.run.outputTokens,
        output: decision.run.output,
        guardrail_flags: decision.flags,
        error: decision.run.error,
      });
      const facts = Object.entries(decision.facts).map(([key, value]) => ({
        lead_id: stored.leadId,
        org_id: stored.orgId,
        key,
        value: value!,
        source: "bot" as const,
        confidence: decision.run.output?.confidence ?? null,
      }));
      if (facts.length) await db.from("lead_facts").upsert(facts);
      await db.from("patients").update({ preferred_language: decision.language }).eq("id", stored.patientId);
      if (documentId && decision.documentKind) await db.from("documents").update({ kind: decision.documentKind }).eq("id", documentId);
      if (decision.proposedStage !== null) {
        const { error } = await db.rpc("move_lead_stage", {
          p_lead_id: stored.leadId,
          p_to_stage: decision.proposedStage,
          p_reason: "bot proposal",
          p_actor: "bot",
        });
        if (error) log.warn("bot.stage_rejected", { leadId: stored.leadId, error: error.message });
      }
      if (decision.handover) {
        await db.from("leads").update({ needs_human: true, needs_human_since: new Date().toISOString() }).eq("id", stored.leadId);
      }
    });

    const sent = await step.run("send-reply", async () => {
      const r = await sendWhatsApp(db, {
        conversationId: stored.conversationId,
        leadId: stored.leadId,
        sender: "bot",
        isReplyToPatient: true,
        content: { kind: "text", text: decision.reply },
      });
      try {
        await markRead(waConfig(), data.message.id);
      } catch (e) {
        log.warn("whatsapp.mark_read_failed", { error: e instanceof Error ? e.message : String(e) });
      }
      return r.status;
    });

    if (decision.proposedStage !== null) {
      await step.sendEvent("stage-changed", {
        name: EVENTS.stageChanged,
        data: { leadId: stored.leadId, orgId: stored.orgId, toStage: decision.proposedStage },
      });
    }
    if (decision.handover) {
      await step.sendEvent("needs-human", {
        name: EVENTS.needsHuman,
        data: { leadId: stored.leadId, orgId: stored.orgId, reason: decision.handoverReason, emergency: decision.emergency },
      });
    }
    return { kind: decision.kind, sent, handover: decision.handover };
  },
);
