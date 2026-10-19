"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useJournal } from "@/components/journal/JournalProvider";
import { LoadingBook } from "@/components/journal/BookGate";
import { DEFAULT_COVER, DEFAULT_HANDWRITING, type CoverTheme, type Handwriting } from "@/lib/book-style";
import { StylePickers } from "./StylePickers";

/** First sign-in: name the child, and the book's folder is created in Google Drive. */
export function SetupForm() {
  const router = useRouter();
  const { status, setupBook, requestSharedAccess } = useJournal();
  const [childName, setChildName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<"details" | "style">("details");
  const [theme, setTheme] = useState<CoverTheme>(DEFAULT_COVER);
  const [hand, setHand] = useState<Handwriting>(DEFAULT_HANDWRITING);
  const [error, setError] = useState<string | null>(null);

  // Already have a book (e.g. set up on another device)? Go straight to it.
  useEffect(() => {
    if (status === "ready") router.replace("/book/write");
  }, [status, router]);

  if (status === "loading" || status === "ready") return <LoadingBook />;

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
      });
      router.replace("/book/write");
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
        <h1 className="font-hand text-4xl font-bold text-ink">Let&rsquo;s start your book</h1>
        <p className="mt-2 font-serif text-lg text-ink-soft">
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

          </>
        ) : (
          <>
        <h1 className="font-hand text-4xl font-bold text-ink">Choose a style</h1>
        <p className="mt-2 font-serif text-lg text-ink-soft">
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

        {step === "details" && (
          <div className="mt-8 rounded-xl border border-dashed border-[rgba(120,90,70,0.25)] bg-white/60 p-4 font-serif text-ink-soft">
            <p className="text-lg text-ink">Has someone shared their Memory Book with you?</p>
            <p className="mt-1 text-sm">
              Google will ask you to let Memory Book open books shared with your account.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="chrome-button field-button" onClick={() => requestSharedAccess(false)}>
                I was invited to view
              </button>
              <button type="button" className="chrome-button field-button" onClick={() => requestSharedAccess(true)}>
                I was invited to add memories
              </button>
            </div>
          </div>
        )}

        <p className="mt-6 font-serif text-sm text-ink-faint italic">
          🔒 These details are saved only in your Google Drive (in <code>journal.json</code>), never on our side.
        </p>

        {error && <p className="mt-4 font-serif text-[var(--ink-terracotta)]">{error}</p>}

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
