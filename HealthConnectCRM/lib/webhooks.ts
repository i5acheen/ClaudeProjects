import "server-only";
import type { AdminDb } from "@/lib/db/admin";
import type { Json } from "@/lib/db/types";

/**
 * Stores raw webhook events, unique on event_key. Returns the ids of rows that were
 * newly inserted, so Meta's retries of an event we already have are not re-enqueued.
 */
export async function storeWebhookEvents(
  db: AdminDb,
  provider: "meta" | "whatsapp",
  events: { key: string; payload: Json }[],
): Promise<Map<string, string>> {
  if (!events.length) return new Map();
  const { data, error } = await db
    .from("webhook_events")
    .upsert(events.map((e) => ({ provider, event_key: e.key, payload: e.payload })), { onConflict: "event_key", ignoreDuplicates: true })
    .select("id, event_key");
  if (error) throw new Error(`webhook_events insert: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.event_key, r.id]));
}
