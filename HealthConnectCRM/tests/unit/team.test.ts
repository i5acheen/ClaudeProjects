import { describe, expect, it } from "vitest";
import { buildTimeline, callsPerDay, computeTeamStats, type TeamInput } from "@/lib/team";

const now = new Date("2026-11-03T12:00:00Z");
const ago = (mins: number) => new Date(now.getTime() - mins * 60_000).toISOString();
const PRIYA = "u-priya";
const RAHUL = "u-rahul";

const input = (): TeamInput => ({
  now,
  since: ago(7 * 24 * 60),
  staff: [
    { user_id: PRIYA, full_name: "Priya", email: null, role: "coordinator", phone_e164: "+919800000001", is_active: true },
    { user_id: RAHUL, full_name: "Rahul", email: null, role: "coordinator", phone_e164: null, is_active: true },
    { user_id: "u-partner", full_name: "Hospital", email: null, role: "hospital_partner", phone_e164: null, is_active: true },
  ],
  leads: [
    {
      id: "L1",
      assigned_to: PRIYA,
      stage: 1,
      created_at: ago(300),
      closed_at: null,
      admitted_at: null,
      needs_human: false,
      patient_name: "A",
    },
    {
      id: "L2",
      assigned_to: PRIYA,
      stage: 0,
      created_at: ago(60),
      closed_at: null,
      admitted_at: null,
      needs_human: true,
      patient_name: "B",
    }, // uncontacted > 15 min
    {
      id: "L3",
      assigned_to: PRIYA,
      stage: 5,
      created_at: ago(20 * 24 * 60),
      closed_at: ago(600),
      admitted_at: ago(600),
      needs_human: false,
      patient_name: "C",
    },
    {
      id: "L4",
      assigned_to: RAHUL,
      stage: 0,
      created_at: ago(5),
      closed_at: null,
      admitted_at: null,
      needs_human: false,
      patient_name: "D",
    }, // too new to count
  ],
  calls: [
    {
      id: "c1",
      user_id: PRIYA,
      lead_id: "L1",
      started_at: ago(290),
      outcome: "no_answer",
      duration_seconds: null,
      notes: null,
      staff_phone: "+919800000001",
    },
    {
      id: "c2",
      user_id: PRIYA,
      lead_id: "L1",
      started_at: ago(200),
      outcome: "connected",
      duration_seconds: 300,
      notes: "will send docs",
      staff_phone: "+919800000001",
    },
    {
      id: "c3",
      user_id: PRIYA,
      lead_id: "L3",
      started_at: ago(30 * 24 * 60),
      outcome: "connected",
      duration_seconds: 60,
      notes: null,
      staff_phone: null,
    }, // outside window
  ],
  messages: [
    { sender_user_id: PRIYA, lead_id: "L1", created_at: ago(100), body: "नमस्कार", type: "text" },
    { sender_user_id: null, lead_id: "L2", created_at: ago(59), body: "[template]", type: "template" },
  ],
  stageEvents: [{ actor_user_id: PRIYA, lead_id: "L1", from_stage: 0, to_stage: 1, created_at: ago(199), reason: "called" }],
  tasks: [
    { assigned_to: PRIYA, due_at: ago(10), done_at: null },
    { assigned_to: PRIYA, due_at: ago(-60), done_at: null },
  ],
  notes: [{ author_id: PRIYA, lead_id: "L1", created_at: ago(198) }],
});

describe("computeTeamStats", () => {
  const stats = computeTeamStats(input());
  const priya = stats.find((s) => s.userId === PRIYA)!;
  const rahul = stats.find((s) => s.userId === RAHUL)!;

  it("only lists coordinators and admins, busiest first", () => {
    expect(stats.map((s) => s.name)).toEqual(["Priya", "Rahul"]);
  });
  it("counts calls in the window, connect rate and talk time", () => {
    expect(priya).toMatchObject({ calls: 2, connected: 1, connectRatePct: 50, talkMinutes: 5, leadsCalled: 1 });
  });
  it("counts WhatsApp replies but not automatic templates", () => {
    expect(priya.messagesSent).toBe(1);
  });
  it("workload: open leads, uncontacted after 15 min, waiting for human, overdue tasks", () => {
    expect(priya).toMatchObject({ openLeads: 2, uncontacted: 1, waitingForHuman: 1, overdueTasks: 1 });
    expect(rahul.uncontacted).toBe(0);
  });
  it("first contact time from lead arrival to first call or reply", () => {
    expect(priya.medianFirstContactMins).toBe(10); // L1: created 300 min ago, first call 290 min ago
  });
  it("outcomes and last activity", () => {
    expect(priya.stageMoves).toBe(1);
    expect(priya.admitted).toBe(1); // counted by admission date (10 h ago), even though the lead is 20 days old
    expect(priya.lastActivityAt).toBe(ago(100));
    expect(rahul.lastActivityAt).toBeNull();
  });
});

describe("timeline and trend", () => {
  it("lists which lead each call, message and stage change was about, newest first", () => {
    const t = buildTimeline(PRIYA, input());
    expect(t.map((x) => x.kind)).toEqual(["message", "note", "stage", "call", "call", "call"]);
    expect(t.find((x) => x.kind === "call" && x.outcome === "connected" && x.patient === "A")?.text).toContain("from +919800000001");
  });
  it("groups calls per IST day", () => {
    const days = callsPerDay(input().calls, ago(7 * 24 * 60));
    expect(days).toEqual([{ day: "2026-11-03", calls: 2, connected: 1 }]);
  });
});
