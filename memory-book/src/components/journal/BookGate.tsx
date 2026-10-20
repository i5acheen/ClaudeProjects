"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import type { Journal } from "@/lib/types";
import { CONSENT_VERSION } from "@/lib/consent";
import { ConsentNotice, consentNow, recordConsent } from "@/components/app/ConsentNotice";
import { useJournal } from "./JournalProvider";

/**
 * Shows the right thing while the book loads from Drive: a quiet loading
 * state, the first-time setup, or a friendly error — and the page itself
 * once the book is ready.
 */
export function BookGate({ children }: { children: (journal: Journal) => React.ReactNode }) {
  const { status, journal, error, reload, access } = useJournal();
  const router = useRouter();

  useEffect(() => {
    if (status === "setup") router.replace("/book/setup");
  }, [status, router]);

  if (status === "ready" && journal) {
    // The book's owner agrees to the current privacy notice once (again whenever it changes).
    const needsConsent = access.known && access.isOwner && journal.settings.consent?.version !== CONSENT_VERSION;
    return (
      <>
        {children(journal)}
        {needsConsent && <ConsentGate journal={journal} />}
      </>
    );
  }

  if (status === "signed-out") {
    return (
      <Notice title="Please sign in again">
        <p>For your security, Google asks you to sign in again from time to time. Anything you saved on this device is kept.</p>
        <button className="chrome-button chrome-button--primary mt-6" onClick={() => signIn("google", { redirectTo: window.location.pathname })}>
          Sign in with Google
        </button>
      </Notice>
    );
  }

  if (status === "needs-permission") return <DrivePermissionNotice />;

  if (status === "error") {
    return (
      <Notice title="We couldn’t open your book">
        <p>{error}</p>
        <button className="chrome-button chrome-button--primary mt-6" onClick={() => reload()}>
          Try again
        </button>
      </Notice>
    );
  }

  return <LoadingBook />;
}

/**
 * Signed in, but Google Drive permission wasn't given (the box was unticked,
 * or Google's screen was closed). Explain why it's needed and ask again.
 */
export function DrivePermissionNotice() {
  const [asking, setAsking] = useState(false);
  return (
    <Notice title="One more permission, please">
      <p>
        Memory Book keeps your book in a folder in <b className="text-ink">your own Google Drive</b>, so it needs Google&rsquo;s
        permission to do that. It looks like that permission wasn&rsquo;t given.
      </p>
      <div className="permission-hint">
        <p className="font-semibold text-ink">On Google&rsquo;s screen:</p>
        <ol>
          <li>Choose your Google account.</li>
          <li>
            Make sure the box next to <b className="text-ink">&ldquo;See, edit, create and delete only the specific Google Drive files
            you use with this app&rdquo;</b> is ticked.
          </li>
          <li>Tap Continue.</li>
        </ol>
        <p className="mt-2 text-sm">The app can only see the files it makes for your book, and photos you choose. Nothing else in your Drive.</p>
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          className="chrome-button chrome-button--primary !h-12 !px-7"
          disabled={asking}
          onClick={() => {
            setAsking(true);
            void signIn("google", { redirectTo: window.location.pathname });
          }}
        >
          {asking ? "Opening Google…" : "Give permission"}
        </button>
        <button type="button" className="chrome-button" onClick={() => signOut({ redirectTo: "/" })}>
          Use a different account
        </button>
      </div>
    </Notice>
  );
}

export function LoadingBook({ message = "Opening your book…" }: { message?: string }) {
  return (
    <div className="flex min-h-[60dvh] flex-1 flex-col items-center justify-center gap-4 text-ink-soft" role="status">
      <div className="loading-book" aria-hidden>
        <span />
        <span />
      </div>
      <p className="font-hand text-2xl">{message}</p>
    </div>
  );
}

export function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    // Centred, but scrolls (never cut off) when it's taller than a small phone screen.
    <div className="flex min-h-[70dvh] flex-1 flex-col overflow-y-auto px-4 py-6">
      <div className="sheet m-auto max-w-md text-center">
        <h1 className="ui-h1">{title}</h1>
        <div className="mt-3 text-lg text-ink-soft">{children}</div>
      </div>
    </div>
  );
}

/** Asked once of the book's owner when the privacy notice is new to them. */
function ConsentGate({ journal }: { journal: Journal }) {
  const { updateSettings } = useJournal();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setSaving(true);
    setError(null);
    try {
      await updateSettings({ ...journal.settings, consent: consentNow() });
      void recordConsent();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Couldn't save that. Please try again.");
    }
  }

  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label="Your child's privacy">
      <div className="note-sheet">
        <h2 className="ui-h2">A quick word about privacy</h2>
        <p className="mt-1 text-ink-soft">We&rsquo;ve written down exactly how {journal.settings.childName || "your child"}&rsquo;s memories are kept. Please read and agree to keep using Memory Book.</p>
        <div className="mt-4">
          <ConsentNotice childName={journal.settings.childName} agreed={agreed} onAgree={setAgreed} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" disabled={!agreed || saving} onClick={agree}>
            {saving ? "Saving…" : "Agree and continue"}
          </button>
          <button type="button" className="chrome-button" onClick={() => signOut({ redirectTo: "/" })}>
            Not now — sign out
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
      </div>
    </div>
  );
}
