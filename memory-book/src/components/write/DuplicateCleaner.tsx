"use client";

import { useState } from "react";
import { useJournal } from "@/components/journal/JournalProvider";

/** One tap to remove the same photo saved more than once. */
export function DuplicateCleaner({ compact }: { compact?: boolean }) {
  const { removeDuplicatePhotos } = useJournal();
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setStatus("Looking for duplicates…");
    try {
      const result = await removeDuplicatePhotos((done, total) => setStatus(`Checking photos… ${done} of ${total}`));
      setStatus(
        result.photos === 0
          ? "No duplicate photos found."
          : `Removed ${result.photos} duplicate photo${result.photos === 1 ? "" : "s"}${
              result.pages ? ` and ${result.pages} empty page${result.pages === 1 ? "" : "s"}` : ""
            }. The removed copies are in your Drive bin for 30 days.`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't finish. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={compact ? "font-serif text-sm text-ink-soft" : "font-serif text-lg text-ink-soft"}>
      {compact && !status && <span>Seeing the same photos more than once? </span>}
      {!busy && (
        <button type="button" className={compact ? "underline decoration-dotted underline-offset-4 hover:text-ink" : "chrome-button field-button"} onClick={run}>
          Remove duplicate photos
        </button>
      )}
      {status && <p className={compact ? "mt-1" : "mt-2 text-base"} role="status">{status}</p>}
    </div>
  );
}
