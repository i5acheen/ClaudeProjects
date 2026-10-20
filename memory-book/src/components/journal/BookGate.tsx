"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import type { Journal } from "@/lib/types";
import { CONSENT_VERSION } from "@/lib/consent";
import { ConsentNotice, consentNow, recordConsent } from "@/components/app/ConsentNotice";
import { useJournal } from "./JournalProvider";
import { APP_NAME } from "@/content/marketing";

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
        {APP_NAME} keeps your book in a folder in <b className="text-ink">your own Google Drive</b>, so it needs Google&rsquo;s
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

/** Little things to read while the book opens; they change every couple of seconds. */
const LOADING_LINES = [
  "Opening your book…",
  "Gathering little moments…",
  "Fluffing the clouds…",
  "Finding your photos…",
  "Turning the pages…",
];

/**
 * While the book opens: a rainbow hot-air balloon (with a teddy in the
 * basket) floating past clouds and twinkling stars.
 */
export function LoadingBook({ message }: { message?: string }) {
  const lines = message ? [message] : LOADING_LINES;
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (lines.length < 2) return;
    const timer = window.setInterval(() => setLine((n) => (n + 1) % lines.length), 2200);
    return () => window.clearInterval(timer);
  }, [lines.length]);

  return (
    <div className="loading-scene" role="status">
      <div className="loading-sky" aria-hidden>
        <Cloud className="loading-cloud loading-cloud--a" />
        <Cloud className="loading-cloud loading-cloud--b" />
        <Cloud className="loading-cloud loading-cloud--c" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className={`loading-star loading-star--${i}`}>
            ✦
          </span>
        ))}
        <Balloon />
      </div>
      <p key={line} className="loading-line">
        {lines[line % lines.length]}
      </p>
    </div>
  );
}

function Cloud({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 100 44">
      <path d="M25 40a15 15 0 0 1 2-30 20 20 0 0 1 37-6 16 16 0 0 1 26 12 12 12 0 0 1 0 24z" />
    </svg>
  );
}

/** A rainbow-striped hot-air balloon, with a teddy waving from the basket. */
function Balloon() {
  const stripes = ["#ff9eb5", "#ffb38a", "#ffe17a", "#9fe0c4", "#a8dcf7", "#c9b8f5"];
  return (
    <svg className="loading-balloon" viewBox="0 0 120 170">
      <defs>
        <clipPath id="loading-envelope">
          <path d="M60 6C30 6 10 28 10 54c0 26 22 44 38 58h24c16-14 38-32 38-58C110 28 90 6 60 6z" />
        </clipPath>
      </defs>
      <g clipPath="url(#loading-envelope)">
        {stripes.map((color, i) => (
          <rect key={color} x={10 + i * (100 / stripes.length)} y="0" width={100 / stripes.length + 0.5} height="120" fill={color} />
        ))}
        <ellipse cx="44" cy="36" rx="10" ry="16" fill="#fff" opacity=".35" />
      </g>
      <path d="M60 6C30 6 10 28 10 54c0 26 22 44 38 58h24c16-14 38-32 38-58C110 28 90 6 60 6z" fill="none" stroke="#2b2d42" strokeOpacity=".12" strokeWidth="2" />
      {/* Ropes */}
      <path d="M50 112l-4 26M70 112l4 26" stroke="#8a6a4a" strokeWidth="1.6" />
      {/* Teddy peeking out of the basket */}
      <g transform="translate(60 138)">
        <circle cx="-8" cy="-11" r="3.6" fill="#c98a5b" />
        <circle cx="8" cy="-11" r="3.6" fill="#c98a5b" />
        <circle cx="0" cy="-5" r="9" fill="#d9a06e" />
        <ellipse cx="0" cy="-2" rx="4" ry="3" fill="#f3d2b0" />
        <circle cx="-3" cy="-7" r="1.1" fill="#2b2d42" />
        <circle cx="3" cy="-7" r="1.1" fill="#2b2d42" />
        <circle cx="0" cy="-3" r="1.1" fill="#2b2d42" />
        <path className="loading-wave" d="M10 -6c3-4 5-7 7-6" stroke="#d9a06e" strokeWidth="3.4" strokeLinecap="round" fill="none" />
      </g>
      {/* Basket */}
      <path d="M44 136h32l-3 22H47z" fill="#c98a5b" />
      <path d="M44 136h32" stroke="#a46b40" strokeWidth="3" strokeLinecap="round" />
      <path d="M47 145h26M48 151h24" stroke="#a46b40" strokeWidth="1.2" opacity=".6" />
    </svg>
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
        <p className="mt-1 text-ink-soft">We&rsquo;ve written down exactly how {journal.settings.childName || "your child"}&rsquo;s memories are kept. Please read and agree to keep using {APP_NAME}.</p>
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
