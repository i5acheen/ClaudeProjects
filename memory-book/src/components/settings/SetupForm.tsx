"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useJournal } from "@/components/journal/JournalProvider";
import { DrivePermissionNotice, LoadingBook } from "@/components/journal/BookGate";
import {
  DEFAULT_COVER,
  DEFAULT_HANDWRITING,
  DEFAULT_PAPER,
  type CoverColor,
  type CoverTheme,
  type Handwriting,
  type Paper,
} from "@/lib/book-style";
import { StylePickers } from "./StylePickers";
import { BackButton } from "@/components/ui/BackButton";
import { ChevronLeft, LockIcon } from "@/components/ui/Icons";
import { ConsentNotice, consentNow, recordConsent } from "@/components/app/ConsentNotice";
import { APP_NAME } from "@/content/marketing";
import { BOOK_FOLDER_PREFIX } from "@/lib/drive/folder";

/** First sign-in: name the child, and the book's folder is created in Google Drive. */
export function SetupForm() {
  const router = useRouter();
  // (Read from the router: after an in-app link, the address bar may not show the new address yet.)
  const params = useSearchParams();
  const { status, journal, setupBook, openSharedBook } = useJournal();
  const [childName, setChildName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [dedication, setDedication] = useState("");
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState<"details" | "style">("details");
  const [theme, setTheme] = useState<CoverTheme>(DEFAULT_COVER);
  const [hand, setHand] = useState<Handwriting>(DEFAULT_HANDWRITING);
  const [color, setColor] = useState<CoverColor>();
  const [paper, setPaper] = useState<Paper>(DEFAULT_PAPER);
  const [error, setError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);

  // "Add another child": a new book even though one already exists.
  const another = params.has("another");
  // "New book for <child>": another book for the child whose book is open (a new volume, say).
  const wantsSame = params.has("same");
  // (With no book yet, there's no child to make another book for: an ordinary first book.)
  const sameChild = wantsSame && status !== "setup";
  const extra = another || sameChild;

  // A new book for the same child starts with their details and the current book's look.
  const prefilled = useRef(false);
  useEffect(() => {
    if (!sameChild || !journal || prefilled.current) return;
    prefilled.current = true;
    const s = journal.settings;
    setChildName(s.childName);
    setDateOfBirth(s.dateOfBirth);
    if (s.coverTheme) setTheme(s.coverTheme);
    setColor(s.coverColor);
    if (s.paper) setPaper(s.paper);
    if (s.handwriting) setHand(s.handwriting);
  }, [sameChild, journal]);
  const sameChildName = sameChild ? (journal?.settings.childName ?? "") : "";

  // Already have a book (e.g. set up on another device)? Go straight to it.
  useEffect(() => {
    if (status === "ready" && !extra && !working) router.replace("/book/write");
  }, [status, router, extra, working]);

  if (status === "loading" || (status === "ready" && !extra) || (sameChild && !journal)) return <LoadingBook />;
  if (status === "needs-permission") return <DrivePermissionNotice />;

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
        bookTitle: bookTitle.trim() || "Little Moments",
        dedication: dedication.trim() || undefined,
        coverTheme: theme,
        coverColor: color,
        paper,
        handwriting: hand,
        consent: consentNow(),
      }, { another: another && !sameChild, sameChild });
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
        {/* Back: to the first step, or (for another child's book) to the book you were in. */}
        {step === "style" ? (
          <button type="button" className="icon-button back-button mb-3" aria-label="Back" title="Back" onClick={() => setStep("details")}>
            <ChevronLeft />
          </button>
        ) : (
          extra && <BackButton fallback="/book/write" className="mb-3" />
        )}
{step === "details" ? (
          <>
        <h1 className="ui-h1">
          {sameChild ? `A new book for ${sameChildName}` : another ? "A book for another child" : "Let’s start your book"}
        </h1>
        {sameChild ? (
          <p className="mt-2 text-lg text-ink-soft">
            A fresh, empty book — for a new year, a new chapter, or a special trip. {sameChildName}&rsquo;s other book stays
            just as it is, and you can switch between them from the top bar. It gets its own folder in your Google Drive:{" "}
            <em>{BOOK_FOLDER_PREFIX} – {sameChildName} – {bookTitle.trim() || "…"}</em>.
          </p>
        ) : (
          <p className="mt-2 text-lg text-ink-soft">
            We&rsquo;ll make a folder called <em>{BOOK_FOLDER_PREFIX} – {childName.trim() || "…"}</em> in your Google Drive. Your
            photos and words are kept there, and nowhere else.
          </p>
        )}

        {!sameChild && (
          <>

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
          </>
        )}

        <label className="field-label mt-6" htmlFor="book-title">
          Book title{" "}
          {!sameChild && <span className="font-normal normal-case italic tracking-normal text-ink-faint">(optional)</span>}
        </label>
        <input
          id="book-title"
          className="text-field"
          placeholder={sameChild ? `${sameChildName}’s Toddler Years` : "Little Moments"}
          value={bookTitle}
          onChange={(e) => setBookTitle(e.target.value)}
          maxLength={40}
          required={sameChild}
          autoFocus={sameChild}
        />
        {sameChild && (
          <p className="mt-1.5 text-sm text-ink-faint">The title tells this book apart from {sameChildName}&rsquo;s other books.</p>
        )}

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
          color={color}
          onColor={setColor}
          paper={paper}
          onPaper={setPaper}
          hand={hand}
          onHand={setHand}
        />

          </>
        )}

        {step === "details" && !extra && (
          <div className="mt-8 rounded-xl border border-dashed border-[rgba(120,90,70,0.25)] bg-white/60 p-4 text-ink-soft">
            <p className="text-lg text-ink">Has someone shared their {APP_NAME} with you?</p>
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
          <LockIcon className="mr-1 inline size-4 align-[-3px]" />These details are saved only in your Google Drive (in <code>journal.json</code>), never on our side.
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
