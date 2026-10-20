"use client";

import { useEffect, useState } from "react";
import type { Journal, Memory } from "@/lib/types";
import { bookPaper, memoryPaper, paperVars, type Paper } from "@/lib/book-style";
import { useJournal } from "@/components/journal/JournalProvider";
import { PaperPicker } from "@/components/settings/StylePickers";

/**
 * Page style, straight from the journal: a colour and a pattern for the page
 * you're looking at, or for the whole book.
 */
export function PageStyleSheet({
  journal,
  memories,
  canStyleBook,
  onClose,
}: {
  journal: Journal;
  /** The pages on screen that can have their own paper. */
  memories: Memory[];
  /** Only the book's owner changes the whole book. */
  canStyleBook: boolean;
  onClose: () => void;
}) {
  const { setPagePaper, updateSettings } = useJournal();
  const forBook = bookPaper(journal.settings);
  const [target, setTarget] = useState<string>(memories[0]?.id ?? "book");
  const memory = memories.find((m) => m.id === target);
  const [paper, setPaper] = useState<Paper | undefined>(memory ? memoryPaper(memory) : forBook);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function choose(next: string) {
    setTarget(next);
    const m = memories.find((x) => x.id === next);
    setPaper(m ? memoryPaper(m) : forBook);
  }

  async function save() {
    setError(null);
    setStatus("Saving…");
    try {
      if (memory) await setPagePaper(memory.id, paper);
      else await updateSettings({ ...journal.settings, paper: paper ?? forBook, pageStyle: undefined });
      onClose();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't change the page style.");
    }
  }

  const preview = paper ?? forBook;
  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label="Page style" onClick={onClose}>
      <div className="note-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="ui-h2">Page style</h2>
        <p className="mt-1 text-ink-soft">Pick a colour and a pattern for the paper.</p>

        {(memories.length > 0 || canStyleBook) && (
          <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Which pages">
            {memories.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={target === m.id}
                className="filter-chip max-w-[14rem] truncate"
                onClick={() => choose(m.id)}
              >
                This page{memories.length > 1 ? `: ${m.title || "untitled"}` : ""}
              </button>
            ))}
            {canStyleBook && (
              <button type="button" role="radio" aria-checked={target === "book"} className="filter-chip" onClick={() => choose("book")}>
                Every page in the book
              </button>
            )}
          </div>
        )}

        <div className="mt-5 flex gap-5">
          <span className="page-style-preview" style={paperVars(preview) as React.CSSProperties} aria-hidden>
            <span className="page-style-preview__lines" />
          </span>
          <div className="min-w-0 flex-1">
            <PaperPicker value={paper} onChange={setPaper} bookPaper={memory ? forBook : undefined} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null}>
            {status ?? (memory ? "Use on this page" : "Use on every page")}
          </button>
          <button type="button" className="chrome-button" onClick={onClose}>
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
      </div>
    </div>
  );
}
