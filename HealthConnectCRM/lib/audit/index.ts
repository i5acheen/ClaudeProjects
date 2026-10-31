import "server-only";
import { headers } from "next/headers";
import { userDb } from "@/lib/db/server";
import type { Json } from "@/lib/db/types";

/** Writes an audit row as the signed-in user via the log_audit() security-definer function. */
export async function audit(action: string, entity: string, entityId: string | null, before?: Json, after?: Json) {
  const h = await headers();
  const db = await userDb();
  const { error } = await db.rpc("log_audit", {
    p_action: action,
    p_entity: entity,
    p_entity_id: entityId ?? "",
    p_before: before ?? undefined,
    p_after: after ?? undefined,
    p_ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    p_user_agent: h.get("user-agent") ?? undefined,
  });
  if (error) throw new Error(`audit failed: ${error.message}`);
}
