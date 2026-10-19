"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import type { Journal } from "@/lib/types";
import { useJournal } from "./JournalProvider";

/**
 * Shows the right thing while the book loads from Drive: a quiet loading
 * state, the first-time setup, or a friendly error — and the page itself
 * once the book is ready.
 */
export function BookGate({ children }: { children: (journal: Journal) => React.ReactNode }) {
  const { status, journal, error, reload } = useJournal();
  const router = useRouter();

  useEffect(() => {
    if (status === "setup") router.replace("/book/setup");
  }, [status, router]);

  if (status === "ready" && journal) return <>{children(journal)}</>;

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
    <div className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="sheet max-w-md text-center">
        <h1 className="ui-h1">{title}</h1>
        <div className="mt-3 text-lg text-ink-soft">{children}</div>
      </div>
    </div>
  );
}
