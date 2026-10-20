"use client";

import { useEffect, useState } from "react";
import { getStorageQuota } from "@/lib/drive/client";

const gb = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(bytes < 10 * 1024 ** 3 ? 1 : 0)} GB`;

/** How full your Google Drive is (the book lives there, so it needs a little space). */
export function StorageCard() {
  const [quota, setQuota] = useState<{ used: number; limit?: number } | null>(null);
  useEffect(() => {
    getStorageQuota()
      .then(setQuota)
      .catch(() => setQuota(null));
  }, []);
  if (!quota) return null;
  const share = quota.limit ? quota.used / quota.limit : 0;
  const nearlyFull = share >= 0.9;

  return (
    <section className="sheet mt-6" aria-labelledby="storage-heading">
      <h2 id="storage-heading" className="ui-h2">
        Google Drive space
      </h2>
      {quota.limit ? (
        <>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-ink/10" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share * 100)} aria-label="Google Drive space used">
            <div className={`h-full rounded-full ${nearlyFull ? "bg-[var(--ink-terracotta)]" : "bg-[var(--accent)]"}`} style={{ width: `${Math.min(100, share * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {gb(quota.used)} of {gb(quota.limit)} used ({Math.round(share * 100)}%).
          </p>
          {nearlyFull && (
            <p className="mt-2 rounded-2xl bg-[var(--accent-soft)]/60 p-3 text-sm text-ink">
              Your Drive is nearly full. New memories are kept safely on this device until there&rsquo;s space — free some up in
              Google Drive, or get more at{" "}
              <a href="https://one.google.com/storage" target="_blank" rel="noreferrer" className="underline decoration-dotted">
                one.google.com
              </a>
              .
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{gb(quota.used)} used — your plan has no fixed limit.</p>
      )}
    </section>
  );
}
