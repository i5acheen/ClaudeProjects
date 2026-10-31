import { z } from "zod";
import { adminDb } from "@/lib/db/admin";
import { waStatusSchema } from "@/lib/whatsapp/webhook";
import { EVENTS, inngest } from "../client";

const RANK = { queued: 0, sent: 1, delivered: 2, read: 3, failed: 4, received: 0 } as const;

/** Delivery ticks; never move a status backwards (webhooks can arrive out of order). */
export const waStatus = inngest.createFunction(
  { id: "wa-status", triggers: [{ event: EVENTS.waStatus }], retries: 3 },
  async ({ event, step }) => {
    const { status, webhookEventId } = z.object({ status: waStatusSchema, webhookEventId: z.string().optional() }).parse(event.data);
    return step.run("update-status", async () => {
      const db = adminDb();
      const { data: msg } = await db.from("messages").select("id, status").eq("wa_message_id", status.id).maybeSingle();
      if (webhookEventId) await db.from("webhook_events").update({ processed_at: new Date().toISOString() }).eq("id", webhookEventId);
      if (!msg) return { skipped: "unknown message" };
      if (RANK[status.status] <= RANK[msg.status]) return { skipped: "older status" };
      await db.from("messages").update({ status: status.status, error_code: status.errors?.[0] ? String(status.errors[0].code) : null }).eq("id", msg.id);
      return { updated: status.status };
    });
  },
);
