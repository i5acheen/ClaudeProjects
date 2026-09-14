import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";
import { CATEGORY_LABELS, CATEGORY_ORDER } from "@/lib/constants";
import type { ControlCategory, ControlStatusValue } from "@/lib/types";

export default async function ControlChecklistPage() {
  const session = await requireSession();

  const controls = await prisma.control.findMany({
    orderBy: [{ category: "asc" }, { code: "asc" }],
    include: {
      statuses: { where: { companyId: session.companyId }, include: { owner: true } },
      evidence: { where: { companyId: session.companyId }, select: { id: true } },
    },
  });

  const byCategory = new Map<ControlCategory, typeof controls>();
  for (const category of CATEGORY_ORDER) byCategory.set(category, []);
  for (const control of controls) {
    byCategory.get(control.category as ControlCategory)?.push(control);
  }

  const total = controls.length;
  const withEvidence = controls.filter((c) => c.evidence.length > 0).length;

  return (
    <div>
      <div className="mb-8 flex items-baseline justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">SOC 2 People Ops Controls</h1>
          <p className="mt-1 text-sm text-slate-500">
            {withEvidence} of {total} controls have evidence attached.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {CATEGORY_ORDER.map((category) => {
          const items = byCategory.get(category) ?? [];
          if (items.length === 0) return null;
          return (
            <section key={category}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {CATEGORY_LABELS[category]}
              </h2>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <ul className="divide-y divide-slate-200">
                  {items.map((control) => {
                    const controlStatus = control.statuses[0];
                    const status = (controlStatus?.status ?? "MISSING") as ControlStatusValue;
                    const owner = controlStatus?.owner;
                    return (
                      <li key={control.id}>
                        <Link
                          href={`/controls/${control.id}`}
                          className="flex flex-col gap-2 px-4 py-3 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-400">{control.code}</span>
                              <span className="truncate text-sm font-medium text-slate-900">{control.title}</span>
                            </div>
                            <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{control.description}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-3">
                            <span className="text-sm text-slate-500">{owner ? owner.name : "Unassigned"}</span>
                            <StatusBadge status={status} />
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
