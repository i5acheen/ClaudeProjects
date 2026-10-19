"use client";

import { FolderIcon } from "@/components/ui/Icons";
import { useJournal } from "@/components/journal/JournalProvider";

/**
 * Bring photos from Google Drive into the book. You choose them in Google's
 * own window, which lets the app open exactly those photos — never the rest
 * of your Drive.
 */
export function DriveFolderCard() {
  const { driveImport, addFromDrive } = useJournal();
  const { importing, progress, lastAdded, message } = driveImport;

  return (
    <section className="sheet">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-ink-soft">
          <FolderIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="ui-h2">Photos from Google Drive</h2>
          <p className="mt-1 text-ink-soft">
            Choose photos that are already in your Drive — from your phone&rsquo;s backup, your computer or family. They
            come into the book ready for your words. Your originals stay where they are.
          </p>
          <button type="button" className="chrome-button chrome-button--primary mt-4" onClick={() => void addFromDrive()} disabled={importing}>
            {importing
              ? progress && progress.total > 0
                ? `Bringing in photos… ${Math.min(progress.done, progress.total)} of ${progress.total}`
                : "Bringing in photos…"
              : "Choose photos from Google Drive"}
          </button>
          {!importing && lastAdded !== undefined && lastAdded > 0 && (
            <p className="mt-2 text-sm text-ink-soft">
              Added {lastAdded} photo{lastAdded === 1 ? "" : "s"} — they&rsquo;re waiting for your words above.
            </p>
          )}
          {message && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{message}</p>}
          <p className="mt-3 text-xs text-ink-faint">
            🔒 Memory Book can only open the photos you choose here. It never sees the rest of your Drive.
          </p>
        </div>
      </div>
    </section>
  );
}
