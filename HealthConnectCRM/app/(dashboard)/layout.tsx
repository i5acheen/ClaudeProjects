import { getLocale } from "next-intl/server";
import { Nav } from "@/components/app/nav";
import { requireRole } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const s = await requireRole("admin", "coordinator", "viewer");
  return (
    <>
      <Nav role={s.profile.role} name={s.profile.full_name || s.email || ""} locale={await getLocale()} />
      <main id="main" className="mx-auto max-w-7xl p-4">
        {children}
      </main>
    </>
  );
}
