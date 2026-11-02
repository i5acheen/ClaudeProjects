import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { CallsChart } from "@/components/app/charts";
import { Badge, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { fmtDateTime } from "@/lib/dates";
import { maskPhone } from "@/lib/phone";
import { callsPerDay, computeTeamStats } from "@/lib/team";
import { loadTeamInput, RANGES, type RangeKey } from "@/lib/team-load";

/** Admin view of coordinator activity: calls (from their own mobiles), replies, workload and results. */
export default async function TeamPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireRole("admin");
  const t = await getTranslations("team");
  const requested = (await searchParams).range;
  const range: RangeKey = (Object.keys(RANGES) as RangeKey[]).find((r) => r === requested) ?? "7d";
  const input = await loadTeamInput(range);
  const stats = computeTeamStats(input);
  const trend = callsPerDay(input.calls, input.since);
  const sum = (k: keyof (typeof stats)[number]) => stats.reduce((a, s) => a + (Number(s[k]) || 0), 0);
  const totalCalls = sum("calls");
  const totals: [string, string | number][] = [
    [t("calls"), totalCalls],
    [t("connected"), `${sum("connected")} (${totalCalls ? Math.round((100 * sum("connected")) / totalCalls) : 0}%)`],
    [t("talk"), Math.round(sum("talkMinutes"))],
    [t("messages"), sum("messagesSent")],
    [t("newAssigned"), sum("newLeadsAssigned")],
    [t("admitted"), sum("admitted")],
    [t("uncontacted"), sum("uncontacted")],
    [t("waiting"), sum("waitingForHuman")],
    [t("overdue"), sum("overdueTasks")],
  ];
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const attention = stats.filter(
    (s) =>
      s.uncontacted > 0 ||
      s.overdueTasks > 0 ||
      s.waitingForHuman > 0 ||
      (s.role === "coordinator" && s.active && (!s.lastActivityAt || s.lastActivityAt < dayAgo)),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{t("title")}</h1>
        <nav aria-label="Range" className="flex gap-1">
          {(Object.keys(RANGES) as RangeKey[]).map((r) => (
            <Link
              key={r}
              href={`/team?range=${r}`}
              aria-current={r === range}
              className={`rounded px-3 py-1 text-sm ${r === range ? "bg-brand text-brand-text" : "border border-border"}`}
            >
              {t(`range_${r}`)}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-label={t("teamTotals")} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
        {totals.map(([label, value]) => (
          <Card key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="text-xl font-semibold" data-testid={`team-total-${label}`}>
              {value}
            </div>
          </Card>
        ))}
      </section>

      {attention.length > 0 && (
        <Card className="border-amber-300">
          <h2 className="mb-2 font-medium">{t("needsAttention")}</h2>
          <ul className="space-y-1 text-sm" data-testid="needs-attention">
            {attention.map((s) => (
              <li key={s.userId}>
                <Link className="font-medium underline" href={`/team/${s.userId}`}>
                  {s.name}
                </Link>
                {s.uncontacted > 0 && (
                  <>
                    {" "}
                    · {s.uncontacted} {t("uncontacted").toLowerCase()}
                  </>
                )}
                {s.waitingForHuman > 0 && (
                  <>
                    {" "}
                    · {s.waitingForHuman} {t("waiting").toLowerCase()}
                  </>
                )}
                {s.overdueTasks > 0 && (
                  <>
                    {" "}
                    · {s.overdueTasks} {t("overdue").toLowerCase()}
                  </>
                )}
                {s.role === "coordinator" && s.active && (!s.lastActivityAt || s.lastActivityAt < dayAgo) && <> · no activity in 24 h</>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm" data-testid="team-table">
          <thead className="bg-bg text-left text-xs text-muted">
            <tr>
              <th className="p-2">{t("coordinator")}</th>
              <th>{t("calls")}</th>
              <th>{t("connected")}</th>
              <th>{t("talk")}</th>
              <th>{t("leadsCalled")}</th>
              <th>{t("messages")}</th>
              <th>{t("moves")}</th>
              <th>{t("referred")}</th>
              <th>{t("admitted")}</th>
              <th>{t("open")}</th>
              <th>{t("uncontacted")}</th>
              <th>{t("overdue")}</th>
              <th>{t("firstContact")}</th>
              <th>{t("lastActive")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.userId} className="border-t border-border">
                <td className="p-2">
                  <Link className="font-medium underline" href={`/team/${s.userId}?range=${range}`}>
                    {s.name}
                  </Link>
                  {!s.active && <Badge className="ml-1">inactive</Badge>}
                  <div className="text-xs text-muted">{s.phone ? maskPhone(s.phone) : t("noMobile")}</div>
                </td>
                <td>{s.calls}</td>
                <td>
                  {s.connected} <span className="text-xs text-muted">({s.connectRatePct}%)</span>
                </td>
                <td>{s.talkMinutes}</td>
                <td>{s.leadsCalled}</td>
                <td>{s.messagesSent}</td>
                <td>{s.stageMoves}</td>
                <td>{s.referred}</td>
                <td>{s.admitted}</td>
                <td>{s.openLeads}</td>
                <td className={s.uncontacted ? "font-semibold text-danger" : ""}>{s.uncontacted}</td>
                <td className={s.overdueTasks ? "font-semibold text-warn" : ""}>{s.overdueTasks}</td>
                <td>{s.medianFirstContactMins ?? "—"}</td>
                <td className="whitespace-nowrap">{fmtDateTime(s.lastActivityAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Card>
        <h2 className="mb-2 font-medium">{t("callsPerDay")}</h2>
        <CallsChart data={trend} />
      </Card>
      <p className="text-xs text-muted">
        Calls are placed from each coordinator&apos;s own mobile using the Call button on a lead and logged with an outcome. Durations are
        as entered by the coordinator. For automatic call records and recordings, a call-masking telephony provider can be connected later.
      </p>
    </div>
  );
}
