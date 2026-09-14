"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { daysUntil, formatDate } from "@/lib/format";

const LINKS = [
  { href: "/", label: "Controls" },
  { href: "/gap-report", label: "Gap Report" },
  { href: "/settings", label: "Settings" },
];

export default function Nav({
  companyName,
  userName,
  auditDate,
}: {
  companyName: string;
  userName: string;
  auditDate: string | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const days = daysUntil(auditDate);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <div>
            <div className="text-sm font-semibold text-slate-900">ComplyTrail</div>
            <div className="text-xs text-slate-500">{companyName}</div>
          </div>
          <nav className="flex gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  pathname === link.href
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          {auditDate ? (
            <span className={`text-xs font-medium ${days !== null && days < 14 ? "text-red-600" : "text-slate-500"}`}>
              Audit date {formatDate(auditDate)}
              {days !== null && ` (${days >= 0 ? `${days}d away` : `${Math.abs(days)}d overdue`})`}
            </span>
          ) : (
            <span className="text-xs text-slate-400">No audit date set</span>
          )}
          <span className="text-slate-500">{userName}</span>
          <button onClick={signOut} className="text-slate-500 hover:text-slate-900">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
