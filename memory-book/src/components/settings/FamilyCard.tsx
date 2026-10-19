"use client";

import { useCallback, useEffect, useState } from "react";
import type { FamilyMember, FamilyRole } from "@/lib/repository";
import { useJournal } from "@/components/journal/JournalProvider";

/**
 * Invite family by email. This uses Google Drive's own sharing on the book
 * folder — Google emails the invitation, and the list below is read live
 * from Drive. Nothing about your family is stored by Memory Book.
 */
export function FamilyCard() {
  const { listFamily, inviteFamily, removeFamily } = useJournal();
  const [members, setMembers] = useState<FamilyMember[] | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<FamilyRole>("reader");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(() => {
    listFamily()
      .then(setMembers)
      .catch(() => setMembers([]));
  }, [listFamily]);
  useEffect(refresh, [refresh]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const address = email.trim().toLowerCase();
    if (!address) return;
    setBusy(true);
    setMessage(null);
    try {
      await inviteFamily(address, role);
      setEmail("");
      setMessage({ ok: true, text: `Invitation sent to ${address}. Google has emailed them a link.` });
      refresh();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : "Couldn't send the invitation." });
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: FamilyMember) {
    if (!confirm(`Stop sharing the book with ${member.email}?`)) return;
    await removeFamily(member.id).catch(() => undefined);
    refresh();
  }

  return (
    <div className="sheet mt-6">
      <h2 className="font-hand text-3xl font-bold text-ink">Family</h2>
      <p className="mt-1 font-serif text-lg text-ink-soft">
        Share the book with grandparents, a partner or anyone close. They sign in with their own Google account — the
        book stays in your Drive.
      </p>

      <ul className="mt-4 divide-y divide-[rgba(120,90,70,0.12)]">
        {members === null && <li className="py-2 font-serif text-ink-faint">Loading…</li>}
        {members?.length === 0 && <li className="py-2 font-serif text-ink-faint italic">Not shared with anyone yet.</li>}
        {members?.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5 font-serif">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-sm font-bold text-[var(--accent-dark)] uppercase">
              {(m.name || m.email)[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{m.name || m.email}</span>
              <span className="block text-sm text-ink-faint">{m.role === "writer" ? "can add memories" : "can view"}</span>
            </span>
            <button type="button" className="text-sm text-ink-soft underline decoration-dotted underline-offset-4" onClick={() => remove(m)}>
              remove
            </button>
          </li>
        ))}
      </ul>

      <form className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={invite}>
        <label className="min-w-0 flex-1">
          <span className="field-label">Invite by email</span>
          <input
            type="email"
            required
            className="text-field"
            placeholder="grandma@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <select className="text-field !w-auto" value={role} onChange={(e) => setRole(e.target.value as FamilyRole)} aria-label="What they can do">
          <option value="reader">can view</option>
          <option value="writer">can add memories</option>
        </select>
        <button type="submit" className="chrome-button chrome-button--primary" disabled={busy}>
          {busy ? "Sending…" : "Invite"}
        </button>
      </form>
      {message && (
        <p className={`mt-3 font-serif text-sm ${message.ok ? "text-ink-soft" : "text-[var(--ink-terracotta)]"}`}>{message.text}</p>
      )}
      <p className="mt-3 font-serif text-sm text-ink-faint italic">
        While the app is in Google&rsquo;s &ldquo;Testing&rdquo; mode, also add their email as a test user in Google Cloud
        (Google Auth Platform → Audience).
      </p>
    </div>
  );
}
