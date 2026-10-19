"use client";

import { useJournal } from "./JournalProvider";

/** A small note when memories are waiting to upload (e.g. you were offline). */
export function SyncBanner() {
  const { pendingCount, syncing, syncNow, error } = useJournal();
  if (pendingCount === 0 && !error) return null;

  return (
    <div className="mx-auto mb-1 flex max-w-xl items-center justify-center gap-3 px-4 text-center text-sm text-ink-soft">
      {pendingCount > 0 ? (
        <>
          <span>
            {syncing
              ? "Uploading to Google Drive…"
              : `${pendingCount === 1 ? "1 memory is" : `${pendingCount} memories are`} saved on this device, waiting to upload.`}
          </span>
          {!syncing && (
            <button className="underline decoration-dotted underline-offset-4 hover:text-ink" onClick={() => syncNow()}>
              Upload now
            </button>
          )}
        </>
      ) : (
        <span>{error}</span>
      )}
    </div>
  );
}
