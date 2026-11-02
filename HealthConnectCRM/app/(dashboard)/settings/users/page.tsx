import { Card } from "@/components/ui";
import { requireRole } from "@/lib/auth/session";
import { userDb } from "@/lib/db/server";
import { InviteForm, UserRow } from "./client";

export default async function UsersPage() {
  const s = await requireRole("admin");
  const db = await userDb();
  const [{ data: users }, { data: hospitals }] = await Promise.all([
    db.from("profiles").select("user_id, full_name, email, role, hospital_id, is_active, phone_e164").order("full_name"),
    db.from("hospitals").select("id, name").order("name"),
  ]);
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Users & roles</h1>
      <Card>
        <InviteForm hospitals={hospitals ?? []} />
      </Card>
      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="w-full text-sm">
          <thead className="bg-bg text-left text-muted">
            <tr>
              <th className="p-2">User</th>
              <th>Role</th>
              <th>Hospital</th>
              <th>Mobile (for call tracking)</th>
              <th>Active</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <UserRow key={u.user_id} u={u} hospitals={hospitals ?? []} self={u.user_id === s.userId} />
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">Role and activation changes are written to the audit log automatically.</p>
    </div>
  );
}
