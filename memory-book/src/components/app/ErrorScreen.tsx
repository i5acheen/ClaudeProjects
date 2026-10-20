"use client";

import Link from "next/link";
import { useEffect } from "react";
import { reportError } from "@/lib/monitoring/report";

/** Shown if a page breaks. Memories live in Google Drive, so nothing is lost. */
export function ErrorScreen({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => reportError(error), [error]);
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-12">
      <div className="sheet max-w-md text-center">
        <p className="text-4xl" aria-hidden>
          🧸
        </p>
        <h1 className="ui-h1 mt-2">Something went wrong</h1>
        <p className="mt-3 text-ink-soft">
          Your memories are safe — they&rsquo;re kept in your Google Drive, and anything you were writing is saved on this device.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary" onClick={reset}>
            Try again
          </button>
          <Link href="/book" className="chrome-button field-button">
            Open the journal
          </Link>
        </div>
        <p className="mt-6 text-xs text-ink-faint">
          Still stuck? Write to{" "}
          <a href="mailto:sacheen501@gmail.com" className="underline decoration-dotted">
            sacheen501@gmail.com
          </a>
          .
        </p>
      </div>
    </main>
  );
}
