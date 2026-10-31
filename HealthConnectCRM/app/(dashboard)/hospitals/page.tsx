import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { HospitalForm } from "./form";

export default async function HospitalsPage() {
  const s = await requireRole("admin", "coordinator");
  const t = await getTranslations("hospitals");
  const { data } = await (await userDb()).from("hospitals").select("*").order("name");
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Hospitals</h1>
      {s.profile.role === "admin" && (
        <Card>
          <HospitalForm />
        </Card>
      )}
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-muted">
            <tr>
              <th className="p-2">Name</th>
              <th>District</th>
              <th>{t("schemes")}</th>
              <th>{t("specialties")}</th>
              <th>{t("contact")}</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((h) => (
              <tr key={h.id} className="border-t border-border">
                <td className="p-2">{h.name}</td>
                <td>{h.district}</td>
                <td>{h.empanelled_schemes.join(", ")}</td>
                <td>{h.specialties.join(", ")}</td>
                <td>
                  {h.contact_name} {h.contact_phone}
                </td>
                <td>{h.is_active ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
