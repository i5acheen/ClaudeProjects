"use client";

import Link from "next/link";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { useJournal } from "@/components/journal/JournalProvider";
import { clearDeviceData } from "@/lib/device-data";
import { GRIEVANCE_EMAIL } from "@/lib/legal";

/** Your data: download all of it, or delete your account. */
export function DataCard() {
  const { journal, folderUrl, access, trashBook } = useJournal();
  const [confirming, setConfirming] = useState(false);
  const [alsoBook, setAlsoBook] = useState(false);
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function download() {
    if (!journal) return;
    const data = {
      about: "Everything in your Memory Book except the photos, which are in the photos folder of your book in Google Drive.",
      exportedAt: new Date().toISOString(),
      ...journal,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `memory-book-${(journal.settings.childName || "book").replace(/[^\w-]+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function deleteAccount() {
    setStatus("Deleting…");
    try {
      if (alsoBook && access.isOwner) await trashBook();
      const response = await fetch("/api/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-account" }),
      });
      if (!response.ok) throw new Error("Couldn't delete the account just now. Please try again.");
      await clearDeviceData({ includingDrafts: true });
      await signOut({ redirectTo: "/?deleted=1" });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't delete the account. Please try again.");
    }
  }

  return (
    <section className="sheet mt-6" aria-labelledby="data-heading">
      <h2 id="data-heading" className="ui-h2">
        Your data
      </h2>
      <p className="mt-1 text-ink-soft">It&rsquo;s all yours. Take it with you, or delete it, whenever you like.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="chrome-button field-button" onClick={download}>
          Download everything
        </button>
        <Link href="/book/export" className="chrome-button field-button">
          Download as a PDF
        </Link>
        {folderUrl && (
          <a href={folderUrl} target="_blank" rel="noreferrer" className="chrome-button field-button">
            Photos: open the Drive folder
          </a>
        )}
      </div>

      <div className="mt-6 border-t border-dashed border-ink-faint/50 pt-4">
        {!confirming ? (
          <button type="button" className="text-sm text-[var(--ink-terracotta)] underline decoration-dotted underline-offset-4" onClick={() => setConfirming(true)}>
            Delete my account
          </button>
        ) : (
          <div className="rounded-2xl bg-[var(--accent-soft)]/50 p-4 text-sm text-ink" role="group" aria-label="Delete my account">
            <p className="ui-h3">Delete your Memory Book account?</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-soft">
              <li>We delete our record of your account and cancel the app&rsquo;s access to your Google account.</li>
              <li>This device forgets the book.</li>
              {access.isOwner ? (
                <li>
                  Your book in Google Drive is <b className="text-ink">kept</b>, unless you choose below to move it to the Drive bin
                  (you can still restore it from there for 30 days).
                </li>
              ) : (
                <li>The book you were invited to stays with its owner.</li>
              )}
            </ul>
            {access.isOwner && (
              <label className="mt-3 flex items-start gap-2">
                <input type="checkbox" className="mt-1 size-4 accent-[var(--accent)]" checked={alsoBook} onChange={(e) => setAlsoBook(e.target.checked)} />
                <span>Also move my book (photos and memories) to the Google Drive bin</span>
              </label>
            )}
            <label className="mt-3 block">
              Type <b>DELETE</b> to confirm
              <input className="text-field mt-1 !w-40" value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type DELETE to confirm" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="chrome-button danger-button" disabled={typed.trim().toUpperCase() !== "DELETE" || status === "Deleting…"} onClick={deleteAccount}>
                {status === "Deleting…" ? "Deleting…" : "Delete my account"}
              </button>
              <button type="button" className="chrome-button" onClick={() => setConfirming(false)}>
                Cancel
              </button>
            </div>
            {status && status !== "Deleting…" && <p className="mt-2 text-[var(--ink-terracotta)]">{status}</p>}
            <p className="mt-3 text-xs text-ink-faint">Questions first? {GRIEVANCE_EMAIL}</p>
          </div>
        )}
      </div>
    </section>
  );
}
