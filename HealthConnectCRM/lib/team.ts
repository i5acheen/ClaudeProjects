/**
 * Team insights for admins: what each coordinator did and how their leads are doing.
 * Pure aggregation (computeTeamStats / buildTimeline) is separate from loading so it can be unit-tested
 * and reused by the demo.
 */
export type StaffIn = {
  user_id: string;
  full_name: string;
  email: string | null;
  role: string;
  phone_e164: string | null;
  is_active: boolean;
};
export type LeadIn = {
  id: string;
  assigned_to: string | null;
  stage: number;
  created_at: string;
  closed_at: string | null;
  admitted_at: string | null;
  needs_human: boolean;
  patient_name: string;
};
export type CallIn = {
  id: string;
  user_id: string;
  lead_id: string;
  started_at: string;
  outcome: string;
  duration_seconds: number | null;
  notes: string | null;
  staff_phone: string | null;
};
export type MessageIn = { sender_user_id: string | null; lead_id: string | null; created_at: string; body: string | null; type: string };
export type StageEventIn = {
  actor_user_id: string | null;
  lead_id: string;
  from_stage: number | null;
  to_stage: number;
  created_at: string;
  reason: string | null;
};
export type TaskIn = { assigned_to: string | null; due_at: string; done_at: string | null };
export type NoteIn = { author_id: string | null; lead_id: string; created_at: string };

export type TeamInput = {
  staff: StaffIn[];
  leads: LeadIn[];
  calls: CallIn[];
  messages: MessageIn[];
  stageEvents: StageEventIn[];
  tasks: TaskIn[];
  notes: NoteIn[];
  /** Start of the reporting window (ISO). Workload metrics (open leads, overdue) are always "now". */
  since: string;
  now?: Date;
};

export type CoordinatorStats = {
  userId: string;
  name: string;
  phone: string | null;
  role: string;
  active: boolean;
  calls: number;
  connected: number;
  connectRatePct: number;
  talkMinutes: number;
  leadsCalled: number;
  messagesSent: number;
  stageMoves: number;
  referred: number;
  admitted: number;
  newLeadsAssigned: number;
  openLeads: number;
  uncontacted: number;
  waitingForHuman: number;
  overdueTasks: number;
  medianFirstContactMins: number | null;
  lastActivityAt: string | null;
};

const UNCONTACTED_AFTER_MS = 15 * 60_000;

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(10 * (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2)) / 10;
}

const maxIso = (...xs: (string | null | undefined)[]) =>
  xs
    .filter((x): x is string => !!x)
    .sort()
    .at(-1) ?? null;

export function computeTeamStats(input: TeamInput): CoordinatorStats[] {
  const now = (input.now ?? new Date()).getTime();
  const inWindow = (iso: string) => iso >= input.since;
  const coordinatorMsgs = input.messages.filter((m) => m.sender_user_id && m.type !== "template");

  // First contact per lead: earliest call or coordinator message, by anyone.
  const firstContact = new Map<string, string>();
  for (const c of input.calls)
    if (!firstContact.has(c.lead_id) || c.started_at < firstContact.get(c.lead_id)!) firstContact.set(c.lead_id, c.started_at);
  for (const m of coordinatorMsgs) {
    if (!m.lead_id) continue;
    if (!firstContact.has(m.lead_id) || m.created_at < firstContact.get(m.lead_id)!) firstContact.set(m.lead_id, m.created_at);
  }

  return input.staff
    .filter((s) => s.role === "coordinator" || s.role === "admin")
    .map((s) => {
      const calls = input.calls.filter((c) => c.user_id === s.user_id && inWindow(c.started_at));
      const connected = calls.filter((c) => c.outcome === "connected");
      const msgs = coordinatorMsgs.filter((m) => m.sender_user_id === s.user_id && inWindow(m.created_at));
      const moves = input.stageEvents.filter((e) => e.actor_user_id === s.user_id && inWindow(e.created_at));
      const mine = input.leads.filter((l) => l.assigned_to === s.user_id);
      const open = mine.filter((l) => !l.closed_at);
      const newAssigned = mine.filter((l) => inWindow(l.created_at));
      const firstContactMins = newAssigned
        .map((l) => (firstContact.has(l.id) ? (Date.parse(firstContact.get(l.id)!) - Date.parse(l.created_at)) / 60_000 : null))
        .filter((x): x is number => x !== null && x >= 0);
      const notes = input.notes.filter((n) => n.author_id === s.user_id);
      return {
        userId: s.user_id,
        name: s.full_name || s.email || "—",
        phone: s.phone_e164,
        role: s.role,
        active: s.is_active,
        calls: calls.length,
        connected: connected.length,
        connectRatePct: calls.length ? Math.round((1000 * connected.length) / calls.length) / 10 : 0,
        talkMinutes: Math.round(connected.reduce((a, c) => a + (c.duration_seconds ?? 0), 0) / 6) / 10,
        leadsCalled: new Set(calls.map((c) => c.lead_id)).size,
        messagesSent: msgs.length,
        stageMoves: moves.length,
        referred: moves.filter((e) => e.to_stage === 4).length,
        admitted: mine.filter((l) => l.admitted_at && inWindow(l.admitted_at)).length,
        newLeadsAssigned: newAssigned.length,
        openLeads: open.length,
        uncontacted: open.filter((l) => l.stage === 0 && !firstContact.has(l.id) && now - Date.parse(l.created_at) > UNCONTACTED_AFTER_MS)
          .length,
        waitingForHuman: open.filter((l) => l.needs_human).length,
        overdueTasks: input.tasks.filter((t) => t.assigned_to === s.user_id && !t.done_at && Date.parse(t.due_at) < now).length,
        medianFirstContactMins: median(firstContactMins),
        lastActivityAt: maxIso(
          input.calls
            .filter((c) => c.user_id === s.user_id)
            .map((c) => c.started_at)
            .sort()
            .at(-1),
          coordinatorMsgs
            .filter((m) => m.sender_user_id === s.user_id)
            .map((m) => m.created_at)
            .sort()
            .at(-1),
          input.stageEvents
            .filter((e) => e.actor_user_id === s.user_id)
            .map((e) => e.created_at)
            .sort()
            .at(-1),
          notes
            .map((n) => n.created_at)
            .sort()
            .at(-1),
        ),
      };
    })
    .sort((a, b) => b.calls - a.calls || b.admitted - a.admitted || a.name.localeCompare(b.name));
}

/** Calls per day (IST) in the window, for the trend chart. */
export function callsPerDay(calls: CallIn[], since: string): { day: string; calls: number; connected: number }[] {
  const by = new Map<string, { calls: number; connected: number }>();
  for (const c of calls.filter((x) => x.started_at >= since)) {
    const day = new Date(Date.parse(c.started_at) + 5.5 * 3600_000).toISOString().slice(0, 10);
    const g = by.get(day) ?? { calls: 0, connected: 0 };
    g.calls += 1;
    g.connected += c.outcome === "connected" ? 1 : 0;
    by.set(day, g);
  }
  return [...by.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));
}

export type TimelineItem = {
  at: string;
  kind: "call" | "message" | "stage" | "note";
  leadId: string | null;
  patient: string;
  text: string;
  outcome?: string;
};

/** Everything one coordinator did, newest first, with the lead it was about. */
export function buildTimeline(
  userId: string,
  input: Pick<TeamInput, "leads" | "calls" | "messages" | "stageEvents" | "notes">,
  limit = 200,
): TimelineItem[] {
  const name = new Map(input.leads.map((l) => [l.id, l.patient_name]));
  const items: TimelineItem[] = [
    ...input.calls
      .filter((c) => c.user_id === userId)
      .map((c) => ({
        at: c.started_at,
        kind: "call" as const,
        leadId: c.lead_id,
        patient: name.get(c.lead_id) ?? "—",
        outcome: c.outcome,
        text: `${c.outcome.replace(/_/g, " ")}${c.duration_seconds ? ` · ${Math.round(c.duration_seconds / 60)} min` : ""}${c.staff_phone ? ` · from ${c.staff_phone}` : ""}${c.notes ? ` — ${c.notes}` : ""}`,
      })),
    ...input.messages
      .filter((m) => m.sender_user_id === userId && m.type !== "template")
      .map((m) => ({
        at: m.created_at,
        kind: "message" as const,
        leadId: m.lead_id,
        patient: m.lead_id ? (name.get(m.lead_id) ?? "—") : "—",
        text: m.body ?? `[${m.type}]`,
      })),
    ...input.stageEvents
      .filter((e) => e.actor_user_id === userId)
      .map((e) => ({
        at: e.created_at,
        kind: "stage" as const,
        leadId: e.lead_id,
        patient: name.get(e.lead_id) ?? "—",
        text: `stage ${e.from_stage ?? "–"} → ${e.to_stage}${e.reason ? ` (${e.reason})` : ""}`,
      })),
    ...input.notes
      .filter((n) => n.author_id === userId)
      .map((n) => ({
        at: n.created_at,
        kind: "note" as const,
        leadId: n.lead_id,
        patient: name.get(n.lead_id) ?? "—",
        text: "added a note",
      })),
  ];
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}
