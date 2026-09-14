"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ControlStatusValue } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/constants";

type UserOption = { id: string; name: string };

export default function StatusOwnerForm({
  controlId,
  initialStatus,
  initialOwnerId,
  users,
}: {
  controlId: string;
  initialStatus: ControlStatusValue;
  initialOwnerId: string | null;
  users: UserOption[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ControlStatusValue>(initialStatus);
  const [ownerId, setOwnerId] = useState(initialOwnerId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(next: { status?: ControlStatusValue; ownerId?: string | null }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/controls/${controlId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not save.");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <label className="block text-xs font-medium text-slate-500">Status</label>
        <select
          value={status}
          disabled={saving}
          onChange={(e) => {
            const value = e.target.value as ControlStatusValue;
            setStatus(value);
            save({ status: value });
          }}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-500">Owner</label>
        <select
          value={ownerId}
          disabled={saving}
          onChange={(e) => {
            const value = e.target.value;
            setOwnerId(value);
            save({ ownerId: value || null });
          }}
          className="mt-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      {saving && <span className="text-xs text-slate-400">Saving...</span>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
