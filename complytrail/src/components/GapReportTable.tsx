"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ControlCategory, ControlStatusValue } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import { CATEGORY_LABELS } from "@/lib/constants";

export type GapRow = {
  id: string;
  code: string;
  title: string;
  category: ControlCategory;
  status: ControlStatusValue;
  ownerName: string | null;
};

type SortKey = "code" | "category" | "status" | "owner";

export default function GapReportTable({ rows, daysToAudit }: { rows: GapRow[]; daysToAudit: number | null }) {
  const [sortKey, setSortKey] = useState<SortKey>("category");
  const [asc, setAsc] = useState(true);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "code") cmp = a.code.localeCompare(b.code);
      else if (sortKey === "category") cmp = CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category]);
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "owner") cmp = (a.ownerName ?? "").localeCompare(b.ownerName ?? "");
      return asc ? cmp : -cmp;
    });
    return copy;
  }, [rows, sortKey, asc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setAsc(true);
    }
  }

  const headers: { key: SortKey; label: string }[] = [
    { key: "code", label: "Control" },
    { key: "category", label: "Category" },
    { key: "status", label: "Status" },
    { key: "owner", label: "Owner" },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((h) => (
              <th key={h.key} className="px-4 py-2 text-left font-medium text-slate-500">
                <button type="button" onClick={() => toggleSort(h.key)} className="flex items-center gap-1 hover:text-slate-900">
                  {h.label}
                  {sortKey === h.key && <span>{asc ? "↑" : "↓"}</span>}
                </button>
              </th>
            ))}
            <th className="px-4 py-2 text-left font-medium text-slate-500">Days to audit</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">
                <Link href={`/controls/${row.id}`} className="font-medium text-brand-600 hover:underline">
                  {row.code}
                </Link>
                <div className="text-slate-600">{row.title}</div>
              </td>
              <td className="px-4 py-2 text-slate-600">{CATEGORY_LABELS[row.category]}</td>
              <td className="px-4 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-2 text-slate-600">{row.ownerName ?? "Unassigned"}</td>
              <td className="px-4 py-2 text-slate-600">
                {daysToAudit === null ? "—" : daysToAudit >= 0 ? `${daysToAudit}d` : `${Math.abs(daysToAudit)}d overdue`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
