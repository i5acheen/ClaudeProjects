import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { toE164 } from "@/lib/phone";
import { PrivacyActions } from "./client";

export default async function PrivacyToolsPage({ searchParams }: { searchParams: Promise<{ phone?: string }> }) {
  await requireRole("admin");
  const t = await getTranslations("privacy");
  const { phone } = await searchParams;
  const e164 = phone ? toE164(phone) : null;
  const { data: patient } = e164
    ? await (
        await userDb()
      )
        .from("patients")
        .select("id, full_name, phone_e164, created_at, deleted_at")
        .eq("phone_e164", e164)
        .maybeSingle()
    : { data: null };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Privacy tools (DPDP)</h1>
      <form className="flex gap-2" method="get">
        <input
          aria-label={t("search")}
          name="phone"
          defaultValue={phone}
          placeholder={t("search")}
          className="rounded border border-border px-2 py-1"
        />
        <button className="rounded bg-brand px-3 py-1 text-brand-text">Search</button>
      </form>
      {phone && !patient && <p className="text-sm text-muted">No patient with that number.</p>}
      {patient && (
        <Card className="space-y-2">
          <div className="font-medium">
            {patient.full_name} · {patient.phone_e164}
          </div>
          {patient.deleted_at ? <p className="text-sm text-muted">Already anonymised.</p> : <PrivacyActions patientId={patient.id} />}
        </Card>
      )}
    </div>
  );
}
