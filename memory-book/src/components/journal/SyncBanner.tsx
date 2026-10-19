"use client";

import { useJournal } from "./JournalProvider";

/** A small note when memories are waiting to upload (e.g. you were offline). */
export function SyncBanner() {
  const { pendingCount, syncing, syncNow, error, notice, dismissNotice } = useJournal();
  if (notice)
    return (
      <div role="status" className="mx-auto mb-2 flex max-w-xl items-start gap-3 rounded-2xl bg-white px-4 py-3 text-sm text-ink shadow-sm">
        <span aria-hidden>🔒</span>
        <span className="flex-1">{notice}</span>
        <button type="button" className="text-ink-soft underline decoration-dotted underline-offset-4" onClick={dismissNotice}>
          OK
        </button>
      </div>
    );
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
