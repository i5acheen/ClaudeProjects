import { getTranslations } from "next-intl/server";
import { FunnelChart, ResponseChart } from "@/components/app/charts";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { loadDashboard } from "@/lib/dashboard";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireRole("admin", "coordinator", "viewer");
  const sp = await searchParams;
  const isStaff = s.profile.role !== "viewer";
  const d = await loadDashboard(isStaff, {
    from: sp.from,
    to: sp.to,
    campaignId: sp.campaign,
    treatment: sp.treatment,
    coordinatorId: sp.coordinator,
  });
  const t = await getTranslations();

  const tiles: [string, number | string][] = isStaff
    ? [
        [t("dashboard.newToday"), d.kpis.newToday],
        [t("dashboard.uncontacted"), d.kpis.uncontacted],
        [t("dashboard.needsHuman"), d.kpis.needsHuman],
        [t("dashboard.eligible"), d.kpis.eligible],
        [t("dashboard.referred"), d.kpis.referred],
        [t("dashboard.admittedMonth"), d.kpis.admittedMonth],
        [t("dashboard.conversion"), `${d.kpis.conversion}%`],
      ]
    : [[t("dashboard.conversion"), `${d.kpis.conversion}%`]];

  const funnel = [
    { name: t("stage.new"), value: d.funnel.leads },
    { name: t("stage.contacted"), value: d.funnel.contacted },
    { name: t("stage.docs_pending"), value: d.funnel.docs_pending },
    { name: t("stage.eligible"), value: d.funnel.eligible },
    { name: t("stage.referred"), value: d.funnel.referred },
    { name: t("stage.admitted"), value: d.funnel.admitted },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{t("nav.dashboard")}</h1>
      <form className="flex flex-wrap items-end gap-2 text-sm" method="get">
        <label>
          From <input className="rounded border border-border px-2 py-1" type="date" name="from" defaultValue={d.range.from} />
        </label>
        <label>
          To <input className="rounded border border-border px-2 py-1" type="date" name="to" defaultValue={d.range.to} />
        </label>
        <label>
          {t("dashboard.campaign")}{" "}
          <select autoComplete="off" name="campaign" defaultValue={sp.campaign ?? ""} className="rounded border border-border px-2 py-1">
            <option value="">—</option>
            {d.campaigns.map((c) => (
              <option key={c.campaign_id} value={c.campaign_id ?? ""}>
                {c.name || c.meta_ad_id}
              </option>
            ))}
          </select>
        </label>
        <label>
          Treatment <input className="rounded border border-border px-2 py-1" name="treatment" defaultValue={sp.treatment ?? ""} />
        </label>
        <button className="rounded bg-brand px-3 py-1 text-brand-text" type="submit">
          Apply
        </button>
      </form>

      <section aria-label="KPIs" className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {tiles.map(([label, value]) => (
          <Card key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="text-2xl font-semibold" data-testid={`kpi-${label}`}>
              {value}
            </div>
          </Card>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-2 font-medium">{t("dashboard.funnel")}</h2>
          <FunnelChart data={funnel} />
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">Median minutes to first reply</h2>
          <ResponseChart data={d.response} />
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <h2 className="mb-2 font-medium">{t("dashboard.campaigns")}</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th>{t("dashboard.campaign")}</th>
              <th>{t("dashboard.ad")}</th>
              <th>{t("dashboard.leads")}</th>
              <th>{t("dashboard.contacted")}</th>
              <th>{t("stage.eligible")}</th>
              <th>{t("dashboard.admitted")}</th>
              <th>{t("dashboard.rate")}</th>
            </tr>
          </thead>
          <tbody>
            {d.campaigns.map((c) => (
              <tr key={c.campaign_id} className="border-t border-border">
                <td>{c.name || "—"}</td>
                <td className="font-mono text-xs">{c.meta_ad_id}</td>
                <td>{c.leads}</td>
                <td>{c.contacted}</td>
                <td>{c.eligible}</td>
                <td>{c.admitted}</td>
                <td>{c.admission_rate_pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="mb-2 font-medium">{t("dashboard.treatments")}</h2>
          <ul className="text-sm">
            {d.treatments.map((x) => (
              <li key={x.name} className="flex justify-between border-t border-border py-1">
                <span>{x.name}</span>
                <span>{x.value}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-2 font-medium">{t("dashboard.templates")}</h2>
          <ul className="text-sm">
            {d.templates.map((x) => (
              <li key={x.category} className="flex justify-between border-t border-border py-1">
                <span>{x.category}</span>
                <span>
                  {x.delivered} / {x.sent}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Meta charges per delivered template by category; replies inside the 24-hour window are free.
          </p>
        </Card>
        {isStaff && (
          <Card>
            <h2 className="mb-2 font-medium">{t("dashboard.leaderboard")}</h2>
            <table className="w-full text-sm">
              <thead className="text-left text-muted">
                <tr>
                  <th />
                  <th>{t("dashboard.leads")}</th>
                  <th>{t("stage.referred")}</th>
                  <th>{t("dashboard.admitted")}</th>
                </tr>
              </thead>
              <tbody>
                {d.leaderboard.map((r) => (
                  <tr key={r.name} className="border-t border-border">
                    <td>{r.name}</td>
                    <td>{r.leads}</td>
                    <td>{r.referred}</td>
                    <td>{r.admitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
