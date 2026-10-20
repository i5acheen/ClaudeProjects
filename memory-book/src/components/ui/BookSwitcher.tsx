"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useOptionalJournal } from "@/components/journal/JournalProvider";

/** One book per child: switch between them from the top bar (shown once there's more than one). */
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

  if (!book || book.books.length < 2) return null;
  const current = book.books.find((b) => b.id === book.currentBookId) ?? book.books[0];

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
        aria-label={`${current.childName}'s book — switch book`}
        title="Switch book"
      >
        <span className="book-switcher__initial" aria-hidden>
          {current.childName.slice(0, 1).toUpperCase() || "?"}
        </span>
        <span className="hidden max-w-32 truncate md:inline">{current.childName}</span>
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
                {b.shared && <span className="block text-xs text-ink-faint">shared with you</span>}
              </span>
            </button>
          ))}
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
