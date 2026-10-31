import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { setLocale, signOut } from "@/app/actions";
import type { Role } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";

const ITEMS: { href: string; key: string; roles: Role[] }[] = [
  { href: "/dashboard", key: "dashboard", roles: ["admin", "coordinator", "viewer"] },
  { href: "/pipeline", key: "pipeline", roles: ["admin", "coordinator"] },
  { href: "/inbox", key: "inbox", roles: ["admin", "coordinator"] },
  { href: "/tasks", key: "tasks", roles: ["admin", "coordinator"] },
  { href: "/hospitals", key: "hospitals", roles: ["admin", "coordinator"] },
  { href: "/settings", key: "settings", roles: ["admin"] },
  { href: "/settings/users", key: "users", roles: ["admin"] },
  { href: "/privacy", key: "privacy", roles: ["admin"] },
  { href: "/portal", key: "portal", roles: ["hospital_partner"] },
];

export async function Nav({ role, name, locale }: { role: Role; name: string; locale: string }) {
  const t = await getTranslations();
  const unread =
    role === "admin" || role === "coordinator"
      ? ((await (await userDb()).from("notifications").select("id", { count: "exact", head: true }).is("read_at", null)).count ?? 0)
      : 0;
  return (
    <header className="border-b border-border bg-surface">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2">
        {t("app.skip")}
      </a>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-2">
        <span className="mr-4 font-semibold text-brand">{t("app.name")}</span>
        <nav aria-label="Main" className="flex flex-1 flex-wrap gap-1 overflow-x-auto">
          {ITEMS.filter((i) => i.roles.includes(role)).map((i) => (
            <Link key={i.href} href={i.href} className="rounded px-2 py-2 text-sm hover:bg-bg">
              {t(`nav.${i.key}`)}
            </Link>
          ))}
        </nav>
        {(role === "admin" || role === "coordinator") && (
          <Link href="/alerts" className="rounded px-2 py-2 text-sm hover:bg-bg" aria-label={`Alerts: ${unread} unread`}>
            🔔 {unread > 0 && <span className="rounded-full bg-danger px-1.5 text-xs text-white">{unread}</span>}
          </Link>
        )}
        <span className="hidden text-sm text-muted sm:inline">{name}</span>
        <form action={setLocale.bind(null, locale === "mr" ? "en" : "mr")}>
          <button className="rounded px-2 py-2 text-sm hover:bg-bg" type="submit">
            {t("app.language")}
          </button>
        </form>
        <form action={signOut}>
          <button className="rounded px-2 py-2 text-sm hover:bg-bg" type="submit">
            {t("app.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
