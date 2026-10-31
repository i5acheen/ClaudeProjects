import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { Badge } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { fmtDateTime } from "@/lib/dates";
import { loadPipeline } from "@/lib/leads-query";
import { maskPhone } from "@/lib/phone";
import { stageKey } from "@/lib/stages";
import { Board } from "./board";
import { NewLeadForm } from "./new-lead";

export default async function PipelinePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const s = await requireRole("admin", "coordinator");
  const sp = await searchParams;
  const leads = await loadPipeline({ q: sp.q, treatment: sp.treatment, assigned: sp.assigned, source: sp.source }, s.userId);
  const t = await getTranslations();
  const view = sp.view === "table" ? "table" : "board";
  const qs = (v: string) =>
    `?${new URLSearchParams({ ...(Object.fromEntries(Object.entries(sp).filter(([, x]) => x)) as Record<string, string>), view: v })}`;

  return (
    <div className="space-y-3">
      <RealtimeRefresh tables={["leads"]} channel="pipeline" />
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">{t("nav.pipeline")}</h1>
        <Link className="rounded px-2 py-1 text-sm underline" href={qs("board")} aria-current={view === "board"}>
          {t("pipeline.board")}
        </Link>
        <Link className="rounded px-2 py-1 text-sm underline" href={qs("table")} aria-current={view === "table"}>
          {t("pipeline.table")}
        </Link>
        <a className="rounded px-2 py-1 text-sm underline" href={`/api/export/leads${qs(view)}`}>
          {t("pipeline.export")}
        </a>
        <NewLeadForm />
      </div>
      <form method="get" className="flex flex-wrap gap-2 text-sm">
        <input type="hidden" name="view" value={view} />
        <input
          aria-label="Search name"
          name="q"
          defaultValue={sp.q}
          placeholder="Name…"
          className="rounded border border-border px-2 py-1"
        />
        <input
          aria-label="Treatment"
          name="treatment"
          defaultValue={sp.treatment}
          placeholder="Treatment…"
          className="rounded border border-border px-2 py-1"
        />
        <select aria-label="Assigned" name="assigned" defaultValue={sp.assigned ?? ""} className="rounded border border-border px-2 py-1">
          <option value="">All</option>
          <option value="me">{t("inbox.mine")}</option>
        </select>
        <select aria-label="Source" name="source" defaultValue={sp.source ?? ""} className="rounded border border-border px-2 py-1">
          <option value="">All sources</option>
          <option value="meta_lead_ad">Meta</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="manual">Manual</option>
          <option value="referral">Referral</option>
        </select>
        <button className="rounded bg-brand px-3 py-1 text-brand-text" type="submit">
          Filter
        </button>
      </form>
      {view === "board" ? (
        <Board leads={leads} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full text-sm">
            <thead className="bg-bg text-left text-muted">
              <tr>
                <th className="p-2">Patient</th>
                <th>Phone</th>
                <th>Treatment</th>
                <th>Stage</th>
                <th>Source</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-2">
                    <Link className="underline" href={`/leads/${l.id}`}>
                      {l.patient.full_name || "—"}
                    </Link>{" "}
                    {l.needs_human && <Badge tone="danger">{t("inbox.needsHuman")}</Badge>}
                  </td>
                  <td>{maskPhone(l.patient.phone_e164)}</td>
                  <td>{l.treatment ?? "—"}</td>
                  <td>{t(`stage.${stageKey(l.stage)}`)}</td>
                  <td>{l.source}</td>
                  <td>{fmtDateTime(l.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
