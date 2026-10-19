"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { PageFlip as PageFlipType } from "page-flip";

/**
 * React wrapper around StPageFlip.
 *
 * The library physically moves page elements around the DOM, which React
 * does not like. So each page is a plain <div> created here and owned by the
 * library, and React renders the page *contents* into it through a portal.
 */

export interface FlipBookHandle {
  next(): void;
  prev(): void;
  flipTo(index: number): void;
}

interface FlipBookProps {
  pageCount: number;
  /** Pages that should be stiff, like the covers. */
  isHard: (index: number) => boolean;
  renderPage: (index: number) => ReactNode;
  startPage?: number;
  onFlip?: (index: number) => void;
  onOrientationChange?: (orientation: "portrait" | "landscape") => void;
  className?: string;
}

/** Base page proportions (3:4). The book scales to fit the space it is given. */
export const PAGE_WIDTH = 450;
export const PAGE_HEIGHT = 600;
const MIN_PAGE_WIDTH = 280;
/** On a tall phone screen a single page may grow taller, like a slim notebook, to fill it. */
const TALLEST_PAGE = 0.6;

/** Page width ÷ height for a space: 3:4 for open spreads, taller for one page on a phone. */
function pageRatio(width: number, height: number): number {
  const base = PAGE_WIDTH / PAGE_HEIGHT;
  if (!width || !height || Math.min(width, height * base * 2) >= MIN_PAGE_WIDTH * 2) return base;
  const ratio = Math.min(base, Math.max(TALLEST_PAGE, width / height));
  return Math.round(ratio * 20) / 20;
}

export const FlipBook = forwardRef<FlipBookHandle, FlipBookProps>(function FlipBook(
  { pageCount, isHard, renderPage, startPage = 0, onFlip, onOrientationChange, className },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlipType | null>(null);
  const [pageEls, setPageEls] = useState<HTMLElement[]>([]);
  const [ratio, setRatio] = useState(PAGE_WIDTH / PAGE_HEIGHT);

  // Keep the latest callbacks/values without rebuilding the book.
  const latest = useRef({ isHard, onFlip, onOrientationChange, startPage });
  latest.current = { isHard, onFlip, onOrientationChange, startPage };
  const currentPage = useRef(startPage);

  useImperativeHandle(ref, () => ({
    next: () => flipRef.current?.flipNext(),
    prev: () => flipRef.current?.flipPrev(),
    flipTo: (index) => {
      const flip = flipRef.current;
      if (!flip) return;
      // Long jumps would animate through every page; only animate short hops.
      if (Math.abs(flip.getCurrentPageIndex() - index) <= 2) flip.flip(index);
      else flip.turnToPage(index);
      currentPage.current = index;
      latest.current.onFlip?.(index);
    },
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container || pageCount === 0) return;
    let cancelled = false;
    let flip: PageFlipType | null = null;
    const host = document.createElement("div");
    host.className = "flipbook-host";
    container.appendChild(host);

    const elements = Array.from({ length: pageCount }, (_, i) => {
      const el = document.createElement("div");
      el.className = "book-page";
      el.dataset.density = latest.current.isHard(i) ? "hard" : "soft";
      el.dataset.index = String(i);
      return el;
    });

    // The library sizes the book from its width only, so pick the widest
    // book that still fits the available height (two pages, or one on phones).
    const fit = () => {
      const { width, height } = container.getBoundingClientRect();
      // A different page shape needs a new book (the library fixes it at the start).
      const wanted = pageRatio(width, height);
      if (wanted !== ratio) {
        setRatio(wanted);
        return;
      }
      const spread = Math.min(width, height * ratio * 2);
      const bookWidth = spread >= MIN_PAGE_WIDTH * 2 ? spread : Math.min(width, height * ratio);
      host.style.width = `${Math.floor(bookWidth)}px`;
      flip?.update();
    };
    const resizeObserver = new ResizeObserver(fit);
    resizeObserver.observe(container);

    // The library touches `window` on import, so load it only in the browser.
    import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      flip = new PageFlip(host, {
        width: PAGE_WIDTH,
        height: Math.round(PAGE_WIDTH / ratio),
        size: "stretch",
        minWidth: MIN_PAGE_WIDTH,
        maxWidth: 640,
        minHeight: Math.round(MIN_PAGE_WIDTH / ratio),
        maxHeight: Math.round(640 / ratio),
        showCover: true,
        usePortrait: true,
        drawShadow: true,
        maxShadowOpacity: 0.35,
        flippingTime: 900,
        mobileScrollSupport: false,
        swipeDistance: 25,
        startPage: Math.min(currentPage.current, pageCount - 1),
      });
      flip.loadFromHTML(elements);
      fit();
      flip.on("flip", (e) => {
        currentPage.current = e.data;
        latest.current.onFlip?.(e.data);
      });
      flip.on("changeOrientation", (e) => latest.current.onOrientationChange?.(e.data));
      latest.current.onOrientationChange?.(flip.getOrientation());
      flipRef.current = flip;
      setPageEls(elements);
    });

    return () => {
      cancelled = true;
      resizeObserver.disconnect();
      flip?.destroy();
      flipRef.current = null;
      host.remove();
      setPageEls([]);
    };
  }, [pageCount, ratio]);

  return (
    <div ref={containerRef} className={className}>
      {pageEls.map((el, i) => createPortal(<div className="page-surface">{renderPage(i)}</div>, el, `page-${i}`))}
    </div>
  );
});
