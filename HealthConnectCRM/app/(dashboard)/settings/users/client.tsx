"use client";
import { useState } from "react";
import { inviteUser, updateUser } from "@/app/actions";
import { Button, Input, Select } from "@/components/ui";

type Role = "admin" | "coordinator" | "hospital_partner" | "viewer";
const ROLES: Role[] = ["admin", "coordinator", "hospital_partner", "viewer"];

export function InviteForm({ hospitals }: { hospitals: { id: string; name: string }[] }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("coordinator");
  async function submit(fd: FormData) {
    const r = await inviteUser({
      email: String(fd.get("email")),
      fullName: String(fd.get("name")),
      role,
      hospitalId: String(fd.get("hospital") || "") || undefined,
    });
    setMsg(r.ok ? "Invited — they can sign in with an email code." : r.error);
  }
  return (
    <form action={submit} className="flex flex-wrap items-end gap-2">
      <Input aria-label="Name" name="name" placeholder="Full name" required className="w-48" />
      <Input aria-label="Email" name="email" type="email" placeholder="email" required className="w-56" />
      <Select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
        {ROLES.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </Select>
      {role === "hospital_partner" && (
        <Select aria-label="Hospital" name="hospital" required>
          {hospitals.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </Select>
      )}
      <Button type="submit">Invite</Button>
      {msg && (
        <p role="status" className="w-full text-sm">
          {msg}
        </p>
      )}
    </form>
  );
}

export function UserRow({
  u,
  hospitals,
  self,
}: {
  u: { user_id: string; full_name: string; email: string | null; role: Role; hospital_id: string | null; is_active: boolean };
  hospitals: { id: string; name: string }[];
  self: boolean;
}) {
  const [role, setRole] = useState<Role>(u.role);
  const [hospital, setHospital] = useState(u.hospital_id ?? "");
  const [active, setActive] = useState(u.is_active);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <tr className="border-t border-border">
      <td className="p-2">
        {u.full_name || "—"}
        <div className="text-xs text-muted">{u.email}</div>
      </td>
      <td>
        <Select aria-label="Role" value={role} disabled={self} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </Select>
      </td>
      <td>
        {role === "hospital_partner" ? (
          <Select aria-label="Hospital" value={hospital} onChange={(e) => setHospital(e.target.value)}>
            <option value="">—</option>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </Select>
        ) : (
          "—"
        )}
      </td>
      <td>
        <input aria-label="Active" type="checkbox" checked={active} disabled={self} onChange={(e) => setActive(e.target.checked)} />
      </td>
      <td>
        <Button
          variant="secondary"
          disabled={self}
          onClick={async () => {
            const r = await updateUser({ userId: u.user_id, role, hospitalId: hospital || null, isActive: active });
            setMsg(r.ok ? "✓" : r.error);
          }}
        >
          Save
        </Button>{" "}
        <span className="text-sm">{msg}</span>
      </td>
    </tr>
  );
}
