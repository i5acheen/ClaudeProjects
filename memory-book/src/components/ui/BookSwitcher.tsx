"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useOptionalJournal } from "@/components/journal/JournalProvider";
import type { BookSummary } from "@/lib/repository";

/** Every book — one or more per child — with switching and starting a new book, from the top bar. */
export function BookSwitcher() {
  const book = useOptionalJournal();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  if (!book || book.books.length === 0) return null;
  const current = book.books.find((b) => b.id === book.currentBookId) ?? book.books[0];
  // The open book's title is the latest one (the list may have been read before a rename).
  const titleOf = (b: BookSummary) => (b.id === current.id ? book.journal?.settings.bookTitle : undefined) ?? b.title;
  // A child with several books: name each one by its title.
  const hasSeveral = (b: BookSummary) => book.books.filter((other) => other.childName === b.childName).length > 1;
  const label = (b: BookSummary) => (hasSeveral(b) && titleOf(b)) || b.childName;
  const canAddBook = !current.shared;

  async function choose(id: string) {
    setOpen(false);
    if (id === current.id || !book) return;
    if (book.pendingCount > 0) {
      alert("A memory is still uploading. Please wait a moment, then switch.");
      return;
    }
    await book.switchBook(id);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="book-switcher"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${label(current)} — your books`}
        title="Your books"
      >
        <span className="book-switcher__initial" aria-hidden>
          {current.childName.slice(0, 1).toUpperCase() || "?"}
        </span>
        <span className="hidden max-w-40 truncate md:inline">{label(current)}</span>
        <span aria-hidden className="hidden md:inline">
          ▾
        </span>
      </button>
      {open && (
        <div className="write-menu !right-auto !bottom-auto top-[calc(100%+0.4rem)] left-0" role="menu">
          {book.books.map((b) => (
            <button key={b.id} type="button" role="menuitem" className="write-menu__item" onClick={() => choose(b.id)}>
              <span className="write-menu__icon" aria-hidden>
                {b.childName.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-ink">
                  {b.childName}
                  {b.id === current.id ? " ✓" : ""}
                </span>
                {(titleOf(b) || b.shared) && (
                  <span className="block truncate text-xs text-ink-faint">
                    {[titleOf(b), b.shared ? "shared with you" : ""].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </button>
          ))}
          {canAddBook && (
            <Link href="/book/setup?another=1&same=1" role="menuitem" className="write-menu__item" onClick={() => setOpen(false)}>
              <span className="write-menu__icon write-menu__icon--new" aria-hidden>
                +
              </span>
              <span className="min-w-0">
                <span className="block truncate text-ink">New book for {current.childName}</span>
                <span className="block text-xs text-ink-faint">a new year, chapter or trip</span>
              </span>
            </Link>
          )}
          <Link href="/book/setup?another=1" role="menuitem" className="write-menu__item" onClick={() => setOpen(false)}>
            <span className="write-menu__icon write-menu__icon--new" aria-hidden>
              +
            </span>
            <span className="text-ink">Add another child</span>
          </Link>
        </div>
      )}
    </div>
  );
}
