import "server-only";
import { userDb } from "@/lib/db/server";
import { daysAgo, istStartOfDay, istStartOfMonth } from "@/lib/dates";

export type DashboardFilters = { from?: string; to?: string; campaignId?: string; treatment?: string; coordinatorId?: string };

/**
 * Dashboard numbers come straight from the database (counts / views) so they match
 * what SQL returns — DoD item "dashboard numbers match database counts".
 */
export async function loadDashboard(isStaff: boolean, f: DashboardFilters = {}) {
  const db = await userDb();
  const from = f.from ?? daysAgo(30).slice(0, 10);
  const to = f.to ?? new Date().toISOString().slice(0, 10);

  let funnelQ = db.from("v_funnel").select("*").gte("day", from).lte("day", to);
  if (f.campaignId) funnelQ = funnelQ.eq("campaign_id", f.campaignId);
  if (f.treatment) funnelQ = funnelQ.eq("treatment", f.treatment);
  const [{ data: funnelRows }, { data: campaigns }, { data: response }, { data: templates }, { data: coordStats }] = await Promise.all([
    funnelQ,
    db.from("v_campaign_performance").select("*").order("leads", { ascending: false }),
    db.from("v_response_times").select("*").order("day"),
    db.from("v_template_counts").select("*").eq("month", istStartOfMonth().slice(0, 10)),
    db.from("v_coordinator_stats").select("*"),
  ]);

  const sum = (k: "leads" | "contacted" | "docs_pending" | "eligible" | "referred" | "admitted" | "lost") =>
    (funnelRows ?? []).reduce((a, r) => a + (r[k] ?? 0), 0);
  const funnel = {
    leads: sum("leads"),
    contacted: sum("contacted"),
    docs_pending: sum("docs_pending"),
    eligible: sum("eligible"),
    referred: sum("referred"),
    admitted: sum("admitted"),
    lost: sum("lost"),
  };
  const byTreatment = new Map<string, number>();
  for (const r of funnelRows ?? [])
    byTreatment.set(r.treatment ?? "unknown", (byTreatment.get(r.treatment ?? "unknown") ?? 0) + (r.leads ?? 0));

  let kpis: Record<string, number> = { conversion: funnel.leads ? Math.round((1000 * funnel.admitted) / funnel.leads) / 10 : 0 };
  let leaderboard: { name: string; leads: number; contacted: number; referred: number; admitted: number }[] = [];

  if (isStaff) {
    const count = async (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => (await build(base())).count ?? 0;
    const base = () => {
      let q = db.from("leads").select("id", { count: "exact", head: true });
      if (f.campaignId) q = q.eq("campaign_id", f.campaignId);
      if (f.treatment) q = q.eq("treatment", f.treatment);
      if (f.coordinatorId) q = q.eq("assigned_to", f.coordinatorId);
      return q;
    };
    const fifteenAgo = new Date(Date.now() - 15 * 60_000).toISOString();
    const [newToday, uncontacted, needsHuman, eligible, referred, admittedMonth] = await Promise.all([
      count((q) => q.gte("created_at", istStartOfDay())),
      count((q) => q.eq("stage", 0).is("closed_at", null).lt("created_at", fifteenAgo)),
      count((q) => q.eq("needs_human", true).is("closed_at", null)),
      count((q) => q.eq("stage", 3)),
      count((q) => q.eq("stage", 4)),
      count((q) => q.gte("admitted_at", istStartOfMonth())),
    ]);
    const { count: callsToday } = await db.from("calls").select("id", { count: "exact", head: true }).gte("started_at", istStartOfDay());
    kpis = { ...kpis, newToday, uncontacted, needsHuman, eligible, referred, admittedMonth, callsToday: callsToday ?? 0 };
    const { data: names } = await db.from("profiles").select("user_id, full_name, email");
    const nameOf = new Map((names ?? []).map((p) => [p.user_id, p.full_name || p.email || "—"]));
    leaderboard = (coordStats ?? [])
      .map((c) => ({
        name: nameOf.get(c.user_id ?? "") ?? "—",
        leads: c.leads ?? 0,
        contacted: c.contacted ?? 0,
        referred: c.referred ?? 0,
        admitted: c.admitted ?? 0,
      }))
      .sort((a, b) => b.admitted - a.admitted || b.referred - a.referred);
  }

  return {
    kpis,
    funnel,
    campaigns: campaigns ?? [],
    treatments: [...byTreatment.entries()].map(([name, value]) => ({ name, value })),
    response: (response ?? []).map((r) => ({ day: r.day ?? "", minutes: Number(r.median_minutes ?? 0), by: r.replied_by ?? "" })),
    templates: templates ?? [],
    leaderboard,
    range: { from, to },
  };
}
