"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useJournal } from "@/components/journal/JournalProvider";
import { LoadingBook } from "@/components/journal/BookGate";
import { DEFAULT_COVER, DEFAULT_HANDWRITING, type CoverTheme, type Handwriting } from "@/lib/book-style";
import { StylePickers } from "./StylePickers";
import { ConsentNotice, consentNow, recordConsent } from "@/components/app/ConsentNotice";

/** First sign-in: name the child, and the book's folder is created in Google Drive. */
export function SetupForm() {
  const router = useRouter();
  const { status, setupBook, openSharedBook } = useJournal();
  const [childName, setChildName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<"details" | "style">("details");
  const [theme, setTheme] = useState<CoverTheme>(DEFAULT_COVER);
  const [hand, setHand] = useState<Handwriting>(DEFAULT_HANDWRITING);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // "Add another child": a new book even though one already exists.
  const [another] = useState(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("another"));

  // Already have a book (e.g. set up on another device)? Go straight to it.
  useEffect(() => {
    if (status === "ready" && !another && !working) router.replace("/book/write");
  }, [status, router, another, working]);

  if (status === "loading" || (status === "ready" && !another)) return <LoadingBook />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === "details") {
      setStep("style");
      window.scrollTo({ top: 0 });
      return;
    }
    setWorking(true);
    setError(null);
    try {
      await setupBook({
        childName: childName.trim(),
        dateOfBirth,
        bookTitle: bookTitle.trim() || `Little Moments`,
        dedication: dedication.trim() || undefined,
        coverTheme: theme,
        handwriting: hand,
        consent: consentNow(),
      }, { another });
      void recordConsent();
      router.replace("/book/write?welcome=1");
    } catch (err) {
      setWorking(false);
      setError(err instanceof Error ? err.message : "Couldn't create your book. Please try again.");
    }
  }

  if (working) return <LoadingBook message="Making your book in Google Drive…" />;

  return (
    <main className="flex min-h-dvh items-center justify-center px-3 py-10">
      <form className="sheet w-full max-w-xl" onSubmit={submit}>
{step === "details" ? (
          <>
        <h1 className="ui-h1">{another ? "A book for another child" : "Let’s start your book"}</h1>
        <p className="mt-2 text-lg text-ink-soft">
          We&rsquo;ll make a folder called <em>Memory Book – {childName.trim() || "…"}</em> in your Google Drive. Your
          photos and words are kept there, and nowhere else.
        </p>

        <label className="field-label mt-7" htmlFor="child-name">
          Your child&rsquo;s name
        </label>
        <input
          id="child-name"
          className="text-field hand-field"
          value={childName}
          onChange={(e) => setChildName(e.target.value)}
          required
          maxLength={40}
          autoFocus
        />

        <label className="field-label mt-6" htmlFor="dob">
          Date of birth
        </label>
        <input
          id="dob"
          type="date"
          className="text-field max-w-56"
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          required
        />

        <label className="field-label mt-6" htmlFor="book-title">
          Book title <span className="font-normal normal-case italic tracking-normal text-ink-faint">(optional)</span>
        </label>
        <input
          id="book-title"
          className="text-field"
          placeholder="Little Moments"
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          maxLength={40}
        />

        <label className="field-label mt-6" htmlFor="dedication">
          A note for the first page <span className="font-normal normal-case italic tracking-normal text-ink-faint">(optional)</span>
        </label>
        <textarea
          id="dedication"
          className="ruled-field"
          rows={3}
          placeholder={`For you, ${childName.trim() || "my darling"} — so you'll always know how loved you were.`}
          value={dedication}
          onChange={(e) => setDedication(e.target.value)}
          maxLength={300}
        />

        <div className="mt-7">
          <ConsentNotice childName={childName} agreed={agreed} onAgree={setAgreed} />
        </div>

          </>
        ) : (
          <>
        <h1 className="ui-h1">Choose a style</h1>
        <p className="mt-2 text-lg text-ink-soft">
          Pick a cover and a writing style for {childName.trim() || "your"}&rsquo;s book. You can change both any time in
          Settings.
        </p>
        <StylePickers
          preview={{ childName: childName.trim(), dateOfBirth, bookTitle: bookTitle.trim() || "Little Moments" }}
          theme={theme}
          onTheme={setTheme}
          hand={hand}
          onHand={setHand}
        />

          </>
        )}

        {step === "details" && !another && (
          <div className="mt-8 rounded-xl border border-dashed border-[rgba(120,90,70,0.25)] bg-white/60 p-4 text-ink-soft">
            <p className="text-lg text-ink">Has someone shared their Memory Book with you?</p>
            <p className="mt-1 text-sm">
              If it doesn&rsquo;t open straight away, Google will show you the books shared with you — choose it once.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="chrome-button field-button"
                onClick={async () => {
                  setError(null);
                  try {
                    await openSharedBook();
                  } catch (e) {
                    setError(e instanceof Error ? e.message : "Couldn't open the shared book.");
                  }
                }}
              >
                Open a book shared with me
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 text-sm text-ink-faint italic">
          🔒 These details are saved only in your Google Drive (in <code>journal.json</code>), never on our side.
        </p>

        {error && <p className="mt-4 text-[var(--ink-terracotta)]">{error}</p>}

        <div className="mt-8 flex gap-3">
          {step === "style" && (
            <button type="button" className="chrome-button field-button !h-12 !px-6" onClick={() => setStep("details")}>
              Back
            </button>
          )}
          <button type="submit" className="chrome-button chrome-button--primary !h-12 flex-1 justify-center !text-lg">
            {step === "details" ? "Next" : "Create my book"}
          </button>
        </div>
      </form>
    </main>
  );
}
