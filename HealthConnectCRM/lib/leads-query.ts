import "server-only";
import { userDb } from "@/lib/db/server";

export type PipelineFilters = { q?: string; treatment?: string; assigned?: string; source?: string };

export type PipelineLead = {
  id: string;
  stage: number;
  treatment: string | null;
  source: string;
  needs_human: boolean;
  bot_enabled: boolean;
  updated_at: string;
  created_at: string;
  assigned_to: string | null;
  patient: { full_name: string; phone_e164: string; district: string | null };
};

export async function loadPipeline(f: PipelineFilters, userId: string): Promise<PipelineLead[]> {
  const db = await userDb();
  let q = db
    .from("leads")
    .select(
      "id, stage, treatment, source, needs_human, bot_enabled, updated_at, created_at, assigned_to, patients!inner(full_name, phone_e164, district, deleted_at)",
    )
    .is("archived_at", null)
    .is("patients.deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(500);
  if (f.treatment) q = q.ilike("treatment", `%${f.treatment}%`);
  if (f.assigned === "me") q = q.eq("assigned_to", userId);
  if (f.source) q = q.eq("source", f.source as "meta_lead_ad");
  if (f.q) q = q.ilike("patients.full_name", `%${f.q.replace(/[%_]/g, "")}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((l) => ({ ...l, patient: l.patients as unknown as PipelineLead["patient"] }));
}
