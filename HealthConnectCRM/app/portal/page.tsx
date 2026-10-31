import { getLocale, getTranslations } from "next-intl/server";
import { Nav } from "@/components/app/nav";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { fmtDateTime } from "@/lib/dates";
import { MarkAdmitted } from "./client";

/** Hospital partner portal (CLAUDE.md §8.8). RLS limits rows to their hospital at stage ≥ Referred. */
export default async function PortalPage() {
  const s = await requireRole("hospital_partner");
  const t = await getTranslations("portal");
  const { data } = await (
    await userDb()
  )
    .from("leads")
    .select("id, stage, treatment, visit_at, admitted_at, patients!inner(full_name)")
    .order("visit_at", { ascending: true });
  return (
    <>
      <Nav role={s.profile.role} name={s.profile.full_name || s.email || ""} locale={await getLocale()} />
      <main id="main" className="mx-auto max-w-4xl space-y-3 p-4">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        {!data?.length && <p className="text-muted">{t("empty")}</p>}
        {(data ?? []).map((l) => (
          <Card key={l.id} className="space-y-2" data-testid="portal-lead">
            <div className="font-medium">{(l.patients as unknown as { full_name: string }).full_name}</div>
            <div className="text-sm text-muted">
              {l.treatment ?? "—"} · Visit: {fmtDateTime(l.visit_at)}
            </div>
            {l.stage === 5 ? (
              <div className="text-sm text-brand">✓ Admitted {fmtDateTime(l.admitted_at)}</div>
            ) : (
              <MarkAdmitted leadId={l.id} />
            )}
          </Card>
        ))}
      </main>
    </>
  );
}
