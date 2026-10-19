"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Journal } from "@/lib/types";
import { memoryPageIndex, pageNumber, paginate } from "@/lib/pagination";
import { BookPageView } from "./BookPages";
import { InkFilters } from "./Doodles";
import { FlipBook, type FlipBookHandle } from "./FlipBook";
import { ChevronLeft, ChevronRight } from "@/components/ui/Icons";

interface BookReaderProps {
  journal: Journal;
  /** Open the book at this memory (from the timeline). */
  startMemoryId?: string;
}

export function BookReader({ journal, startMemoryId }: BookReaderProps) {
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
    (i: number) => <BookPageView page={pages[i]} index={i} settings={journal.settings} />,
    [pages, journal.settings],
  );

  const isHard = useCallback((i: number) => i === 0 || i === pages.length - 1, [pages.length]);

  const position = describePosition(current, last, orientation);

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
