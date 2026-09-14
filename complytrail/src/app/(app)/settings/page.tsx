import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AuditDateForm from "@/components/AuditDateForm";
import AddTeammateForm from "@/components/AddTeammateForm";

export default async function SettingsPage() {
  const session = await requireSession();

  const [company, users] = await Promise.all([
    prisma.company.findUnique({ where: { id: session.companyId } }),
    prisma.user.findMany({ where: { companyId: session.companyId }, orderBy: { createdAt: "asc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">{company?.name}</p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Audit date</h2>
        {session.role === "ADMIN" ? (
          <AuditDateForm initialDate={company?.auditDate ? company.auditDate.toISOString() : null} />
        ) : (
          <p className="text-sm text-slate-500">Only admins can change the audit date.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Team</h2>
        <ul className="mb-4 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <div>
                <span className="font-medium text-slate-900">{u.name}</span>{" "}
                <span className="text-slate-500">{u.email}</span>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {u.role}
              </span>
            </li>
          ))}
        </ul>
        {session.role === "ADMIN" ? (
          <AddTeammateForm />
        ) : (
          <p className="text-sm text-slate-500">Only admins can add teammates.</p>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Integrations</h2>
        <p className="text-sm text-slate-500">
          No HRIS/IdP integrations in v1 — onboarding, offboarding, and access-review evidence is entered
          manually. A future integration (Okta, Workday, SuccessFactors, etc.) would plug in here to
          auto-populate evidence for the access-related controls (PPL-04, PPL-05, PPL-09, PPL-10).
        </p>
      </section>
    </div>
  );
}
