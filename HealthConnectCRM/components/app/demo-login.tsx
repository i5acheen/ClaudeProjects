import { enterDemo } from "@/app/actions";
import { Card } from "@/components/ui";

const ROLES = [
  { role: "admin", title: "Admin", desc: "Everything: dashboard, pipeline, inbox, settings, users, privacy tools" },
  { role: "coordinator", title: "Coordinator", desc: "Day-to-day work: pipeline, WhatsApp inbox, patient profiles, tasks" },
  { role: "hospital_partner", title: "Hospital partner", desc: "SAMPLE Vascular Hospital: only its referred patients; mark admission" },
  { role: "viewer", title: "Viewer", desc: "Dashboard aggregates only — no patient data" },
] as const;

/** Prototype login: pick a role. Shown only when NEXT_PUBLIC_DEMO_MODE=1. */
export function DemoLogin() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg space-y-4">
        <div>
          <h1 className="text-xl font-semibold">HealthConnect CRM — prototype</h1>
          <p className="mt-1 text-sm text-muted">
            Sample data only (no database, no real patients). Changes are kept in memory and reset when the server restarts. WhatsApp and
            Meta are simulated. Choose a role to explore:
          </p>
        </div>
        <ul className="space-y-2">
          {ROLES.map((r) => (
            <li key={r.role}>
              <form action={enterDemo.bind(null, r.role)}>
                <button
                  type="submit"
                  className="w-full rounded-md border border-border p-3 text-left hover:bg-bg"
                  data-testid={`demo-${r.role}`}
                >
                  <span className="font-medium">{r.title}</span>
                  <span className="block text-sm text-muted">{r.desc}</span>
                </button>
              </form>
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
