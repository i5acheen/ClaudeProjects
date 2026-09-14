import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { daysUntil, formatDate } from "@/lib/format";
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
        evidence: { where: { companyId: session.companyId }, select: { id: true } },
      },
    }),
  ]);

  const gapControls = controls.filter((c) => c.evidence.length === 0);
  const rows: GapRow[] = gapControls.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
    category: c.category as ControlCategory,
    status: (c.statuses[0]?.status ?? "MISSING") as ControlStatusValue,
    ownerName: c.statuses[0]?.owner?.name ?? null,
  }));

  const days = daysUntil(company?.auditDate ?? null);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-slate-900">Gap Report</h1>
        <p className="mt-1 text-sm text-slate-500">
          {rows.length} of {controls.length} controls have no evidence yet.
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
          Every control has evidence attached. Nice work.
        </div>
      ) : (
        <GapReportTable rows={rows} daysToAudit={days} />
      )}
    </div>
  );
}
