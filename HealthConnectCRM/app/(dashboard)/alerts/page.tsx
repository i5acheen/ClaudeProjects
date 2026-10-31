import Link from "next/link";
import { markAlertsRead } from "@/app/actions";
import { RealtimeRefresh } from "@/components/app/realtime-refresh";
import { Badge, Button, Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { fmtDateTime } from "@/lib/dates";

/** In-app coordinator alerts: needs-human handovers, emergencies, escalations, call reminders (CLAUDE.md §9). */
export default async function AlertsPage() {
  await requireRole("admin", "coordinator");
  const { data } = await (
    await userDb()
  )
    .from("notifications")
    .select("id, kind, body, lead_id, read_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-3">
      <RealtimeRefresh tables={["notifications"]} channel="alerts" />
      <div className="flex items-center gap-2">
        <h1 className="mr-auto text-xl font-semibold">Alerts</h1>
        <form action={markAlertsRead}>
          <Button variant="secondary" type="submit">
            Mark all read
          </Button>
        </form>
      </div>
      <Card>
        <ul>
          {(data ?? []).map((n) => (
            <li key={n.id} className="flex flex-wrap items-center gap-2 border-t border-border py-2 text-sm" data-testid="alert">
              <Badge tone={n.kind === "emergency" ? "danger" : n.kind === "needs_human" || n.kind === "escalation" ? "warn" : "default"}>
                {n.kind}
              </Badge>
              <span className={n.read_at ? "text-muted" : "font-medium"}>{n.body}</span>
              {n.lead_id && (
                <Link className="underline" href={`/leads/${n.lead_id}`}>
                  Open lead
                </Link>
              )}
              <span className="ml-auto text-xs text-muted">{fmtDateTime(n.created_at)}</span>
            </li>
          ))}
          {!data?.length && <li className="text-sm text-muted">No alerts.</li>}
        </ul>
      </Card>
    </div>
  );
}
