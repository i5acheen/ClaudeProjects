import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysUntil, formatDate, getEvidenceStaleness } from "@/lib/format";
import { STALE_AFTER_DAYS } from "@/lib/constants";
import GapReportTable, { type GapRow } from "@/components/GapReportTable";
import type { ControlCategory, ControlStatusValue } from "@/lib/types";

export default async function GapReportPage() {
  const session = await requireSession();

  const [company, controls] = await Promise.all([
    prisma.company.findUnique({ where: { id: session.companyId } }),
    prisma.control.findMany({
      orderBy: [{ category: "asc" }, { code: "asc" }],
      include: {
        statuses: { where: { companyId: session.companyId }, include: { owner: true } },
        evidence: { where: { companyId: session.companyId }, select: { id: true, uploadedAt: true } },
      },
    }),
  ]);

  const rows: GapRow[] = [];
  for (const c of controls) {
    const { latest, stale } = getEvidenceStaleness(c.evidence.map((e) => e.uploadedAt), STALE_AFTER_DAYS);
    const missing = c.evidence.length === 0;
    if (!missing && !stale) continue;
    rows.push({
      id: c.id,
      code: c.code,
      title: c.title,
      category: c.category as ControlCategory,
      status: (c.statuses[0]?.status ?? "MISSING") as ControlStatusValue,
      ownerName: c.statuses[0]?.owner?.name ?? null,
      reason: missing ? "MISSING" : "STALE",
      lastEvidenceAt: latest ? latest.toISOString() : null,
    });
  }

  const days = daysUntil(company?.auditDate ?? null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Gap Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} of {controls.length} controls need attention — missing evidence or evidence older than{" "}
          {STALE_AFTER_DAYS} days.
        </p>
        {company?.auditDate ? (
          <p className={`mt-2 text-sm font-medium ${days !== null && days < 14 ? "text-red-600" : "text-slate-700"}`}>
            Audit date: {formatDate(company.auditDate)}{" "}
            {days !== null && (days >= 0 ? `(${days} days away)` : `(${Math.abs(days)} days overdue)`)}
          </p>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No audit date set —{" "}
            <Link href="/settings" className="text-brand-600 hover:underline">
              set one in Settings
            </Link>{" "}
            to see urgency here.
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Every control has evidence attached and it&apos;s all within the last {STALE_AFTER_DAYS} days. Nice work.
        </div>
      ) : (
        <GapReportTable rows={rows} daysToAudit={days} />
      )}
    </div>
  );
}
