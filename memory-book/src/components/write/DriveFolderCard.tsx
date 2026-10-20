"use client";

import { useEffect, useState } from "react";
import { CloudUpIcon, FolderIcon, LockIcon, RefreshIcon } from "@/components/ui/Icons";
import { useJournal } from "@/components/journal/JournalProvider";
import { APP_NAME } from "@/content/marketing";

/** "Check for new photos": opens Google's picker in the Drive folder you used last. */
export function DriveRefreshButton({ className = "" }: { className?: string }) {
  const { driveImport, addFromDrive } = useJournal();
  const { importing, progress, hasFolder } = driveImport;
  return (
    <button
      type="button"
      className={`chrome-button field-button ${className}`}
      onClick={() => void addFromDrive(hasFolder ? "last-folder" : "anywhere")}
      disabled={importing}
    >
      <span aria-hidden className={`inline-flex ${importing ? "animate-spin" : ""}`}>
        {hasFolder ? <RefreshIcon /> : <CloudUpIcon />}
      </span>
      {importing
        ? progress && progress.total > 0
          ? `Bringing in photos… ${Math.min(progress.done, progress.total)} of ${progress.total}`
          : "Bringing in photos…"
        : hasFolder
          ? "Check for new photos"
          : "Choose photos from Google Drive"}
    </button>
  );
}

/**
 * Bring photos from Google Drive into the book. You tick them in Google's own
 * window, which lets the app open exactly those photos — never the rest of
 * your Drive. On Android you can also share photos straight into the app.
 */
export function DriveFolderCard() {
  const { driveImport, addFromDrive } = useJournal();
  const { importing, lastAdded, message, hasFolder } = driveImport;
  const [android, setAndroid] = useState(false);
  useEffect(() => setAndroid(/Android/i.test(navigator.userAgent)), []);

  return (
    <section className="sheet" aria-labelledby="drive-heading">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-ink-soft">
          <FolderIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="drive-heading" className="ui-h2">
            Photos from Google Drive
          </h2>
          <p className="mt-1 text-ink-soft">
            {hasFolder
              ? "Added new photos to your Drive folder? Tap below — it opens that folder, and you tick the new ones."
              : "Choose photos that are already in your Drive — from your phone’s backup, your computer or family. They come into the book ready for your words."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <DriveRefreshButton />
            {hasFolder && !importing && (
              <button type="button" className="text-sm text-ink-soft underline decoration-dotted underline-offset-4" onClick={() => void addFromDrive("anywhere")}>
                Choose from another folder
              </button>
            )}
          </div>
          {!importing && lastAdded !== undefined && (
            <p className="mt-2 text-sm text-ink-soft">
              {lastAdded > 0
                ? `Added ${lastAdded} photo${lastAdded === 1 ? "" : "s"} — they’re waiting for your words above.`
                : "No new photos were added."}
            </p>
          )}
          {message && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{message}</p>}

          <div className="mt-4 rounded-2xl bg-[var(--accent-soft)]/60 p-3 text-sm text-ink-soft">
            <b className="text-ink">{android ? "Quickest on your phone:" : "On an Android phone:"}</b> install {APP_NAME} (Settings →
            &ldquo;Keep it on your home screen&rdquo;), then in Google Photos or your Gallery select photos and tap{" "}
            <b className="text-ink">Share → {APP_NAME}</b>. They go straight into the book.
          </div>
          <p className="mt-3 text-xs text-ink-faint">
            <LockIcon className="mr-1 inline size-4 align-[-3px]" />{APP_NAME} can only open the photos you choose or share. It never sees the rest of your Drive, so it can&rsquo;t
            watch a folder by itself.
          </p>
        </div>
      </div>
    </section>
  );
}
