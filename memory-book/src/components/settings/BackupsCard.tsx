"use client";

import { useEffect, useState } from "react";
import { useJournal } from "@/components/journal/JournalProvider";
import { longDate } from "@/lib/dates";

/**
 * Safety copies of the book. Once a week the app keeps a copy of all the
 * words and dates (photos stay in photos/) in your Drive's backups folder.
 * Restoring only adds back memories that are missing — it never removes any.
 */
export function BackupsCard() {
  const { journal, listBackups, restoreFromBackup, folderUrl } = useJournal();
  const [backups, setBackups] = useState<{ id: string; date: string }[] | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listBackups()
      .then(setBackups)
      .catch(() => setBackups([]));
  }, [listBackups]);

  async function restore(id: string) {
    setBusy(true);
    setStatus("Looking for missing memories…");
    try {
      const restored = await restoreFromBackup(id);
      setStatus(
        restored === 0
          ? "Nothing was missing — every memory in that backup is already in the book."
          : `Brought back ${restored} memor${restored === 1 ? "y" : "ies"}.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't restore from that backup.");
    } finally {
      setBusy(false);
    }
  }

  const unreadable = journal?.unreadable ?? 0;
  return (
    <section className="sheet mt-6" aria-labelledby="backups-heading">
      <h2 id="backups-heading" className="ui-h2">
        Backups
      </h2>
      <p className="mt-1 text-ink-soft">
        Once a week, a copy of all your words and dates is kept in the <b className="text-ink">backups</b> folder of your book in
        Google Drive (the last 4). Photos stay safely in the photos folder.
      </p>
      {unreadable > 0 && (
        <p className="mt-3 rounded-2xl bg-[var(--accent-soft)]/60 p-3 text-sm text-ink">
          {unreadable} saved entr{unreadable === 1 ? "y" : "ies"} couldn&rsquo;t be read (perhaps edited by hand). Nothing was deleted —
          {unreadable === 1 ? " it's" : " they're"} kept as {unreadable === 1 ? "it was" : "they were"} in your Drive. If a memory is
          missing, bring it back from a backup below.
        </p>
      )}
      {backups === null ? (
        <p className="mt-3 text-sm text-ink-faint">Loading…</p>
      ) : backups.length === 0 ? (
        <p className="mt-3 text-sm text-ink-faint">The first backup is made the next time you open the book.</p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/5">
          {backups.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-ink">{b.date ? longDate(b.date.slice(0, 10)) : "Backup"}</span>
              <button type="button" className="chrome-button field-button !h-9 !px-3 !text-sm" onClick={() => restore(b.id)} disabled={busy}>
                Bring back missing memories
              </button>
            </li>
          ))}
        </ul>
      )}
      {status && (
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {status}
        </p>
      )}
      {folderUrl && (
        <p className="mt-3 text-xs text-ink-faint">
          Drive also keeps earlier versions of each file for 30 days (
          <a href={folderUrl} target="_blank" rel="noreferrer" className="underline decoration-dotted">
            open the book folder
          </a>{" "}
          → right-click a file → Manage versions).
        </p>
      )}
    </section>
  );
}
