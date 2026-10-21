"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookPageView } from "@/components/book/BookPages";
import { FlipBook, type FlipBookHandle } from "@/components/book/FlipBook";
import { ChevronLeft, ChevronRight } from "@/components/ui/Icons";
import { demoJournal } from "@/lib/demo-data";
import { paginate } from "@/lib/pagination";

/** Pages turned by themselves after opening, one after another. */
const AUTO_TURNS = 3;
const TURN_EVERY_MS = 1500;

/** The demo book, opened on the home page: one page at a time, like flicking through it. */
export function HomeBookOpen() {
  const pages = useMemo(() => paginate(demoJournal, undefined, false), []);
  const book = useRef<FlipBookHandle>(null);
  const [current, setCurrent] = useState(0);
  const timers = useRef<number[]>([]);
  const started = useRef(false);

  const stopAuto = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  // As soon as the book is ready: open the cover, then turn a few pages, unless the visitor prefers less motion.
  const onReady = useCallback(() => {
    if (started.current) return;
    started.current = true;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const turns = calm ? 1 : AUTO_TURNS;
    for (let i = 0; i < turns; i++) timers.current.push(window.setTimeout(() => book.current?.next(), 350 + i * TURN_EVERY_MS));
  }, []);
  useEffect(() => stopAuto, [stopAuto]);

  const renderPage = useCallback(
    (i: number) => <BookPageView page={pages[i]} index={i} settings={demoJournal.settings} growth={demoJournal.growth} />,
    [pages],
  );
  const last = pages.length - 1;

  return (
    <div className="home-book home-book--open" onPointerDown={stopAuto}>
      <div className="home-flip">
        <FlipBook
          ref={book}
          className="flex h-full w-full items-center"
          pageCount={pages.length}
          isHard={(i) => i === 0 || i === last}
          renderPage={renderPage}
          onFlip={setCurrent}
          onOrientationChange={onReady}
        />
      </div>
      <div className="home-flip__controls">
        <button
          type="button"
          className="round-button"
          aria-label="Previous page"
          disabled={current === 0}
          onClick={() => {
            stopAuto();
            book.current?.prev();
          }}
        >
          <ChevronLeft />
        </button>
        <Link href="/demo" className="home-flip__more">
          Look inside the whole book
        </Link>
        <button
          type="button"
          className="round-button"
          aria-label="Next page"
          disabled={current >= last}
          onClick={() => {
            stopAuto();
            book.current?.next();
          }}
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}
