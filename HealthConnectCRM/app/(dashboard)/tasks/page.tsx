import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { completeTask } from "@/app/actions";
import { ActionButton } from "@/components/app/action-button";
import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { fmtDateTime, istStartOfDay } from "@/lib/dates";

export default async function TasksPage() {
  const s = await requireRole("admin", "coordinator");
  const t = await getTranslations("tasks");
  const db = await userDb();
  const endOfDay = new Date(Date.parse(istStartOfDay()) + 86400_000).toISOString();
  const { data } = await db
    .from("tasks")
    .select("id, type, due_at, lead_id, leads!inner(patients!inner(full_name))")
    .eq("assigned_to", s.userId)
    .is("done_at", null)
    .lt("due_at", endOfDay)
    .order("due_at");
  const now = Date.now();
  const rows = (data ?? []).map((r) => ({ ...r, name: (r.leads as unknown as { patients: { full_name: string } }).patients.full_name }));
  const groups: [string, typeof rows][] = [
    [t("overdue"), rows.filter((r) => Date.parse(r.due_at) < now - 3600_000)],
    [t("today"), rows.filter((r) => Date.parse(r.due_at) >= now - 3600_000)],
  ];
  return (
    <div className="space-y-4">
      {groups.map(([title, list]) => (
        <Card key={title}>
          <h2 className="mb-2 font-medium">
            {title} ({list.length})
          </h2>
          {list.length === 0 ? (
            <p className="text-sm text-muted">{t("empty")}</p>
          ) : (
            <ul>
              {list.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-2 border-t border-border py-2 text-sm">
                  <span className="font-medium">{r.type}</span>
                  <Link className="underline" href={`/leads/${r.lead_id}`}>
                    {r.name || "—"}
                  </Link>
                  <span className="text-muted">{fmtDateTime(r.due_at)}</span>
                  <span className="ml-auto">
                    <ActionButton action={completeTask.bind(null, r.id)}>{t("done")}</ActionButton>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
