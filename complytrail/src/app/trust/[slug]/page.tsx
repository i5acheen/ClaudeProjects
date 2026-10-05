import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatDate, getEvidenceStaleness } from "@/lib/format";
import { CATEGORY_LABELS, CATEGORY_ORDER, STALE_AFTER_DAYS } from "@/lib/constants";
import type { ControlCategory } from "@/lib/types";

// Public, unauthenticated page (see middleware.ts) — only aggregate pass
// rates are shown here, never raw evidence, file contents, or people data.
export default async function TrustCenterPage({ params }: { params: { slug: string } }) {
  const company = await prisma.company.findUnique({ where: { trustSlug: params.slug } });
  if (!company || !company.trustCenterEnabled) notFound();

  const controls = await prisma.control.findMany({
    orderBy: [{ category: "asc" }, { code: "asc" }],
    include: { evidence: { where: { companyId: company.id }, select: { uploadedAt: true } } },
  });

  const byCategory = new Map<ControlCategory, { total: number; current: number }>();
  for (const category of CATEGORY_ORDER) byCategory.set(category, { total: 0, current: 0 });

  let currentCount = 0;
  for (const c of controls) {
    const { stale } = getEvidenceStaleness(c.evidence.map((e) => e.uploadedAt), STALE_AFTER_DAYS);
    const isCurrent = c.evidence.length > 0 && !stale;
    if (isCurrent) currentCount++;
    const bucket = byCategory.get(c.category as ControlCategory);
    if (bucket) {
      bucket.total += 1;
      if (isCurrent) bucket.current += 1;
    }
  }

  const total = controls.length;
  const pct = total === 0 ? 0 : Math.round((currentCount / total) * 100);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Trust Center</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">{company.name}</h1>
          <p className="mt-2 text-sm text-slate-500">
            Live SOC 2 People Ops compliance status, generated from evidence tracked in ComplyTrail.
          </p>
        </div>

        <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 text-center">
          <div className="text-4xl font-semibold text-brand-600">{pct}%</div>
          <p className="mt-1 text-sm text-slate-500">
            {currentCount} of {total} controls have current evidence (verified within the last {STALE_AFTER_DAYS}{" "}
            days)
          </p>
          {company.auditDate && (
            <p className="mt-3 text-xs text-slate-400">Next audit: {formatDate(company.auditDate)}</p>
          )}
        </div>

        <div className="space-y-3">
          {CATEGORY_ORDER.map((category) => {
            const bucket = byCategory.get(category);
            if (!bucket || bucket.total === 0) return null;
            const categoryPct = Math.round((bucket.current / bucket.total) * 100);
            return (
              <div key={category} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-900">{CATEGORY_LABELS[category]}</span>
                  <span className="text-slate-500">
                    {bucket.current}/{bucket.total}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${categoryPct}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          This page shares high-level compliance status only — no underlying evidence, documents, or personal
          data are exposed here. Powered by ComplyTrail.
        </p>
      </div>
    </div>
  );
}
