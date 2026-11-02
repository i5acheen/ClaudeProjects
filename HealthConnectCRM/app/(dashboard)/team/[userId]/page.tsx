import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { fmtDateTime } from "@/lib/dates";
import { buildTimeline, computeTeamStats } from "@/lib/team";
import { loadTeamInput, RANGES, type RangeKey } from "@/lib/team-load";

const ICON = { call: "📞", message: "💬", stage: "➡️", note: "📝" } as const;

/** One coordinator: headline numbers and a timeline of every call, reply, stage move and note, with the lead. */
export default async function CoordinatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ range?: string; kind?: string }>;
}) {
  await requireRole("admin");
  const t = await getTranslations("team");
  const tc = await getTranslations("calls");
  const { userId } = await params;
  const sp = await searchParams;
  const range: RangeKey = (Object.keys(RANGES) as RangeKey[]).find((r) => r === sp.range) ?? "7d";
  const input = await loadTeamInput(range);
  const s = computeTeamStats(input).find((x) => x.userId === userId);
  if (!s) notFound();
  const kind = ["call", "message", "stage", "note"].includes(sp.kind ?? "") ? sp.kind : undefined;
  const timeline = buildTimeline(userId, input).filter((i) => !kind || i.kind === kind);
  const cards: [string, string | number][] = [
    [t("calls"), s.calls],
    [t("connected"), `${s.connected} (${s.connectRatePct}%)`],
    [t("talk"), s.talkMinutes],
    [t("messages"), s.messagesSent],
    [t("open"), s.openLeads],
    [t("uncontacted"), s.uncontacted],
    [t("overdue"), s.overdueTasks],
    [t("admitted"), s.admitted],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/team?range=${range}`} className="text-sm underline">
          ← {t("title")}
        </Link>
        <h1 className="text-xl font-semibold">{s.name}</h1>
        <Badge>{s.role}</Badge>
        {s.phone ? (
          <a className="font-mono text-sm underline" href={`tel:${s.phone}`}>
            {s.phone}
          </a>
        ) : (
          <span className="text-sm text-muted">{t("noMobile")}</span>
        )}
        <span className="ml-auto text-sm text-muted">
          {t("lastActive")}: {fmtDateTime(s.lastActivityAt)}
        </span>
      </div>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {cards.map(([label, value]) => (
          <Card key={label}>
            <div className="text-xs text-muted">{label}</div>
            <div className="text-xl font-semibold">{value}</div>
          </Card>
        ))}
      </section>
      <Card>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-medium">{t("activity")}</h2>
          {[undefined, "call", "message", "stage", "note"].map((k) => (
            <Link
              key={k ?? "all"}
              href={`/team/${userId}?range=${range}${k ? `&kind=${k}` : ""}`}
              aria-current={k === kind}
              className={`rounded px-2 py-1 text-xs ${k === kind ? "bg-brand text-brand-text" : "border border-border"}`}
            >
              {k ? `${ICON[k as keyof typeof ICON]} ${k}` : "all"}
            </Link>
          ))}
        </div>
        <ol className="text-sm" data-testid="activity-timeline">
          {timeline.map((i, n) => (
            <li key={n} className="flex flex-wrap gap-2 border-t border-border py-1.5">
              <span className="w-36 shrink-0 text-muted">{fmtDateTime(i.at)}</span>
              <span>{ICON[i.kind]}</span>
              {i.leadId ? (
                <Link className="font-medium underline" href={`/leads/${i.leadId}`}>
                  {i.patient}
                </Link>
              ) : (
                <span>{i.patient}</span>
              )}
              <span className="text-muted">
                {i.kind === "call" && i.outcome ? `${tc(`outcome_${i.outcome}`)} · ` : ""}
                {i.text}
              </span>
            </li>
          ))}
          {!timeline.length && <li className="text-muted">—</li>}
        </ol>
      </Card>
    </div>
  );
}
