import "server-only";
import { userDb } from "@/lib/db/server";
import type { CallIn, LeadIn, MessageIn, NoteIn, StageEventIn, StaffIn, TaskIn, TeamInput } from "./team";

export const RANGES = { today: 1, "7d": 7, "30d": 30 } as const;
export type RangeKey = keyof typeof RANGES;

/** Start of the window: IST midnight for "today", otherwise N days back. */
export function rangeStart(range: RangeKey, now = new Date()): string {
  if (range === "today") {
    const ist = new Date(now.getTime() + 5.5 * 3600_000);
    return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 5.5 * 3600_000).toISOString();
  }
  return new Date(now.getTime() - RANGES[range] * 86400_000).toISOString();
}

/** Loads everything the Team page needs. Activity is limited to 60 days so the page stays fast. */
export async function loadTeamInput(range: RangeKey): Promise<TeamInput> {
  const db = await userDb();
  const since = rangeStart(range);
  const activitySince = new Date(Date.now() - 60 * 86400_000).toISOString();
  const [staff, leads, calls, messages, events, tasks, notes] = await Promise.all([
    db.from("profiles").select("user_id, full_name, email, role, phone_e164, is_active"),
    db
      .from("leads")
      .select("id, assigned_to, stage, created_at, closed_at, admitted_at, needs_human, patients!inner(full_name)")
      .is("archived_at", null),
    db
      .from("calls")
      .select("id, user_id, lead_id, started_at, outcome, duration_seconds, notes, staff_phone")
      .gte("started_at", activitySince),
    db
      .from("messages")
      .select("sender_user_id, lead_id, created_at, body, type")
      .eq("direction", "out")
      .eq("is_internal_note", false)
      .gte("created_at", activitySince),
    db.from("stage_events").select("actor_user_id, lead_id, from_stage, to_stage, created_at, reason").gte("created_at", activitySince),
    db.from("tasks").select("assigned_to, due_at, done_at").is("done_at", null),
    db.from("notes").select("author_id, lead_id, created_at").gte("created_at", activitySince),
  ]);
  return {
    since,
    staff: (staff.data ?? []) as StaffIn[],
    leads: (leads.data ?? []).map((l) => ({ ...l, patient_name: (l.patients as unknown as { full_name: string }).full_name })) as LeadIn[],
    calls: (calls.data ?? []) as CallIn[],
    messages: (messages.data ?? []) as MessageIn[],
    stageEvents: (events.data ?? []) as StageEventIn[],
    tasks: (tasks.data ?? []) as TaskIn[],
    notes: (notes.data ?? []) as NoteIn[],
  };
}
