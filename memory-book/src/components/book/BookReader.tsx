"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Journal, Memory } from "@/lib/types";
import { memoryPageIndex, pageNumber, paginate } from "@/lib/pagination";
import { BookPageView } from "./BookPages";
import { InkFilters } from "./Doodles";
import { FlipBook, type FlipBookHandle } from "./FlipBook";
import { ChevronLeft, ChevronRight } from "@/components/ui/Icons";

interface BookReaderProps {
  journal: Journal;
  /** Open the book at this memory (from the timeline). */
  startMemoryId?: string;
  /** Where the "Edit" button for a memory goes (not shown in the demo). */
  editHref?: (memoryId: string) => string;
}

/** Pages further than this from the open spread are drawn blank until you get near them, so big books stay fast. */
const RENDER_WINDOW = 4;

export function BookReader({ journal, startMemoryId, editHref }: BookReaderProps) {
  const pages = useMemo(() => paginate(journal), [journal]);
  const startPage = useMemo(
    () => (startMemoryId ? (memoryPageIndex(pages).get(startMemoryId) ?? 0) : 0),
    [pages, startMemoryId],
  );

  const bookRef = useRef<FlipBookHandle>(null);
  const [current, setCurrent] = useState(startPage);
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  const last = pages.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") bookRef.current?.next();
      if (e.key === "ArrowLeft") bookRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const renderPage = useCallback(
    (i: number) =>
      Math.abs(i - current) <= RENDER_WINDOW || i === 0 || i === last ? (
        <BookPageView page={pages[i]} index={i} settings={journal.settings} />
      ) : (
        <div className="paper" />
      ),
    [pages, journal.settings, current, last],
  );

  const isHard = useCallback((i: number) => i === 0 || i === pages.length - 1, [pages.length]);

  const position = describePosition(current, last, orientation);

  // The memories on screen right now, for the "Edit" buttons.
  const visible = orientation === "landscape" ? [current, current + 1] : [current];
  const visibleMemories: Memory[] = [];
  for (const i of editHref ? visible : []) {
    const page = pages[i];
    if (page?.kind === "memory" && !visibleMemories.some((m) => m.id === page.memory.id)) visibleMemories.push(page.memory);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <InkFilters />
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 sm:px-6">
        <button
          className="round-button absolute left-2 z-10 hidden sm:grid"
          onClick={() => bookRef.current?.prev()}
          disabled={current === 0}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>

        <FlipBook
          ref={bookRef}
          className="flex h-full w-full max-w-[1280px] items-center"
          pageCount={pages.length}
          isHard={isHard}
          renderPage={renderPage}
          startPage={startPage}
          onFlip={setCurrent}
          onOrientationChange={setOrientation}
        />

        <button
          className="round-button absolute right-2 z-10 hidden sm:grid"
          onClick={() => bookRef.current?.next()}
          disabled={current >= last}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </div>

      <div className="flex h-14 shrink-0 items-center justify-center gap-4 font-serif text-ink-soft">
        <button className="round-button sm:hidden" onClick={() => bookRef.current?.prev()} disabled={current === 0} aria-label="Previous page">
          <ChevronLeft />
        </button>
        <span className="min-w-36 text-center text-base italic" aria-live="polite">
          {position}
        </span>
        <button className="round-button sm:hidden" onClick={() => bookRef.current?.next()} disabled={current >= last} aria-label="Next page">
          <ChevronRight />
        </button>
        {editHref &&
          visibleMemories.map((m) => (
            <Link
              key={m.id}
              href={editHref(m.id)}
              className="chrome-button !h-9 max-w-44 !px-3 !text-sm"
              title={`Edit “${m.title || "this memory"}”`}
            >
              <span aria-hidden>✎</span>
              <span className="truncate">
                <span className="sm:hidden">Edit</span>
                <span className="hidden sm:inline">{m.title || "Edit"}</span>
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}

function describePosition(index: number, last: number, orientation: "portrait" | "landscape"): string {
  if (index === 0) return "the cover";
  if (index >= last) return "the back cover";
  if (index <= 2) return "the first pages";
  if (index >= last - 2) return "the last pages";
  const total = pageNumber(last - 2);
  const n = pageNumber(index);
  // In a two-page spread the library reports the left-hand page.
  return orientation === "landscape" ? `pages ${n}–${n + 1} of ${total}` : `page ${n} of ${total}`;
}
