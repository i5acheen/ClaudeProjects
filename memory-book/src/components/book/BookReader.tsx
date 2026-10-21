"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Journal, Memory } from "@/lib/types";
import { memoryPageIndex, pageNumber, paginate } from "@/lib/pagination";
import { BookPageView } from "./BookPages";
import { InkFilters } from "./Doodles";
import { FlipBook, type FlipBookHandle } from "./FlipBook";
import { ChevronLeft, ChevronRight, CloseIcon, ExpandIcon, MailIcon, MoonIcon, PaletteIcon, PenIcon, PlusIcon, SparklesIcon, SunIcon } from "@/components/ui/Icons";

interface BookReaderProps {
  journal: Journal;
  /** Open the book at this memory (from the timeline). */
  startMemoryId?: string;
  /** Write on the page you're reading (not in the demo). */
  onEdit?: (memory: Memory) => void;
  /** Write a letter to your child (not in the demo). */
  onNewNote?: () => void;
  /** Add a new page with photos and words (not in the demo). */
  onNewPage?: () => void;
  /** Edit the cover's title and photo (the book's owner only). */
  onEditCover?: () => void;
  /** Edit a month divider page (the book's owner only). */
  onEditMonth?: (months: number) => void;
  /** Add a guided page ("Hello, world!", "All about me"…). */
  onNewGuided?: () => void;
  /** Change the paper of the pages on screen, or of the whole book. */
  onPageStyle?: (memories: Memory[]) => void;
  /** Turn to this memory whenever it changes (e.g. right after saving it). */
  focusMemoryId?: string;
}

/** Pages further than this from the open spread are drawn blank until you get near them, so big books stay fast. */
const RENDER_WINDOW = 4;

export function BookReader({
  journal,
  startMemoryId,
  onEdit,
  onNewNote,
  onNewPage,
  onEditCover,
  onEditMonth,
  onPageStyle,
  onNewGuided,
  focusMemoryId,
}: BookReaderProps) {
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("landscape");
  // One page at a time (phones) needs no filler pages to keep spreads together.
  const pages = useMemo(() => paginate(journal, undefined, orientation === "landscape"), [journal, orientation]);
  const startPage = useMemo(
    () => (startMemoryId ? (memoryPageIndex(pages).get(startMemoryId) ?? 0) : 0),
    [pages, startMemoryId],
  );

  const bookRef = useRef<FlipBookHandle>(null);
  const [current, setCurrent] = useState(startPage);
  const last = pages.length - 1;
  const immersive = useImmersive();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") bookRef.current?.next();
      if (e.key === "ArrowLeft") bookRef.current?.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // After saving, turn to the page that was just written.
  useEffect(() => {
    if (!focusMemoryId) return;
    const index = memoryPageIndex(pages).get(focusMemoryId);
    if (index === undefined) return;
    const timer = window.setTimeout(() => bookRef.current?.flipTo(index), 150);
    return () => window.clearTimeout(timer);
  }, [focusMemoryId, pages]);

  const renderPage = useCallback(
    (i: number) =>
      // A page can be gone for a moment while the book is rebuilt (e.g. a memory deleted on another device).
      pages[i] && (Math.abs(i - current) <= RENDER_WINDOW || i === 0 || i === last) ? (
        <BookPageView page={pages[i]} index={i} settings={journal.settings} growth={journal.growth} />
      ) : (
        <div className="paper" />
      ),
    [pages, journal.settings, journal.growth, current, last],
  );

  const isHard = useCallback((i: number) => i === 0 || i === pages.length - 1, [pages.length]);

  const position = describePosition(current, last, orientation);

  // The memories on screen right now, for the "Edit" buttons.
  const visible = orientation === "landscape" ? [current, current + 1] : [current];
  const visibleMemories: Memory[] = [];
  const visibleMonths = onEditMonth
    ? visible.flatMap((i) => {
        const page = pages[i];
        return page?.kind === "month" ? [page.months] : [];
      })
    : [];
  for (const i of onEdit ? visible : []) {
    const page = pages[i];
    if (page?.kind === "memory" && !visibleMemories.some((m) => m.id === page.memory.id)) visibleMemories.push(page.memory);
  }
  // Pages you can write on or restyle (sealed letters stay sealed).
  const writable = onEdit
    ? visibleMemories.filter((m) => !(m.sealedUntil && pages.some((p) => p.kind === "memory" && p.memory.id === m.id && p.sealed)))
    : [];

  return (
    <div
      className={immersive.on ? `book-immersive ${immersive.night ? "book-immersive--night" : ""} ${immersive.idle ? "book-immersive--idle" : ""}` : "flex min-h-0 flex-1 flex-col"}
      onPointerMove={immersive.wake}
      onPointerDown={immersive.wake}
    >
      <InkFilters />
      {immersive.on && (
        <div className="immersive-tools">
          <button
            type="button"
            className="immersive-tool"
            onClick={immersive.toggleNight}
            aria-label={immersive.night ? "Light background" : "Dark background"}
            title={immersive.night ? "Light background" : "Dark background"}
          >
            {immersive.night ? <SunIcon /> : <MoonIcon />}
          </button>
          <button type="button" className="immersive-tool" onClick={immersive.exit} aria-label="Leave full screen" title="Leave full screen">
            <CloseIcon />
          </button>
        </div>
      )}
      <div className={`relative flex min-h-0 flex-1 items-center justify-center ${immersive.on ? "px-1 py-2 sm:px-10 sm:py-6" : "px-2 sm:px-6"}`}>
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
          closed={
            orientation !== "landscape" ? undefined : current === 0 ? "front" : current >= last && pages.length % 2 === 0 ? "back" : undefined
          }
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

      <div className="book-controls relative flex h-14 shrink-0 items-center justify-center gap-2 sm:gap-4 text-ink-soft">
        {!immersive.on && (
          <button type="button" className="round-button absolute left-3 sm:left-5" onClick={immersive.enter} aria-label="Read full screen" title="Read full screen">
            <ExpandIcon />
          </button>
        )}
        <button className="round-button sm:hidden" onClick={() => bookRef.current?.prev()} disabled={current === 0} aria-label="Previous page">
          <ChevronLeft />
        </button>
        <span className="min-w-36 text-center text-base italic" aria-live="polite">
          {current === 0 && onEditCover && !immersive.on ? (
            <button type="button" className="cover-edit-link underline decoration-dotted underline-offset-4 hover:text-ink" onClick={onEditCover}>
              <PenIcon className="inline size-4 align-[-2px]" /> edit the cover
            </button>
          ) : visibleMonths.length > 0 && !immersive.on ? (
            <>
              <span className="hidden sm:inline">{position} · </span>
              <button type="button" className="underline decoration-dotted underline-offset-4 hover:text-ink" onClick={() => onEditMonth?.(visibleMonths[0])}>
                <PenIcon className="inline size-4 align-[-2px]" /> month page
              </button>
            </>
          ) : (
            position
          )}
        </span>
        <button className="round-button sm:hidden" onClick={() => bookRef.current?.next()} disabled={current >= last} aria-label="Next page">
          <ChevronRight />
        </button>
        {!immersive.on && (onEdit || onNewNote || onNewPage) && (
          <WriteMenu
            memories={writable}
            onPageStyle={onPageStyle}
            onNewGuided={onNewGuided}
            onEdit={onEdit}
            onNewNote={onNewNote}
            onNewPage={onNewPage}
            onEditCover={current === 0 ? onEditCover : undefined}
            months={visibleMonths}
            onEditMonth={onEditMonth}
            childName={journal.settings.childName}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Full-screen reading: the book alone on a desk, filling the screen. Uses the
 * browser's real full screen where it can (not on iPhone), and fades the
 * controls away while you read.
 */
const NIGHT_KEY = "memory-book:reading-night";

function useImmersive() {
  const [on, setOn] = useState(false);
  const [idle, setIdle] = useState(false);
  const [night, setNight] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIdle(true), 2800);
  }, []);

  const toggleNight = useCallback(() => {
    setNight((value) => {
      try {
        localStorage.setItem(NIGHT_KEY, value ? "0" : "1");
      } catch {
        // just for this visit
      }
      return !value;
    });
  }, []);

  const enter = useCallback(() => {
    try {
      setNight(localStorage.getItem(NIGHT_KEY) === "1");
    } catch {
      // keep the default
    }
    setOn(true);
    wake();
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) root.requestFullscreen({ navigationUI: "hide" }).catch(() => {});
  }, [wake]);

  const exit = useCallback(() => {
    setOn(false);
    window.clearTimeout(timer.current);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    if (!on) return;
    // Leaving the browser's full screen (Esc, back gesture) also leaves reading mode.
    const onChange = () => !document.fullscreenElement && setOn(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exit();
      else wake();
    };
    document.addEventListener("fullscreenchange", onChange);
    window.addEventListener("keydown", onKey);
    document.body.classList.add("is-reading");
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const color = meta?.content;
    if (meta) meta.content = night ? "#1c1a18" : "#ebe5de";
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      window.removeEventListener("keydown", onKey);
      document.body.classList.remove("is-reading");
      if (meta && color) meta.content = color;
    };
  }, [on, night, exit, wake]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return { on, idle, night, enter, exit, wake, toggleNight };
}

/** One quiet pen button; its menu offers the pages on screen and a new note. */
function WriteMenu({
  memories,
  onPageStyle,
  onNewGuided,
  onEdit,
  onNewNote,
  onNewPage,
  onEditCover,
  months = [],
  onEditMonth,
  childName,
}: {
  months?: number[];
  onEditMonth?: (months: number) => void;
  memories: Memory[];
  onPageStyle?: (memories: Memory[]) => void;
  onNewGuided?: () => void;
  childName: string;
  onEditCover?: () => void;
  onEdit?: (memory: Memory) => void;
  onNewNote?: () => void;
  onNewPage?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", close);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={ref} className="absolute right-3 bottom-2 sm:right-5">
      {open && (
        <div className="write-menu" role="menu">
          {onNewPage && (
            <button type="button" role="menuitem" className="write-menu__item" onClick={() => choose(onNewPage)}>
              <span className="write-menu__icon write-menu__icon--new" aria-hidden>
                <PlusIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-ink">New page</span>
                <span className="block text-xs text-ink-faint">Photos and a few lines</span>
              </span>
            </button>
          )}
          {onNewGuided && (
            <button type="button" role="menuitem" className="write-menu__item" onClick={() => choose(onNewGuided)}>
              <span className="write-menu__icon write-menu__icon--guided" aria-hidden>
                <SparklesIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-ink">Guided page</span>
                <span className="block text-xs text-ink-faint">Hello world, All about me, My firsts…</span>
              </span>
            </button>
          )}
          {memories.map((m) => (
            <button key={m.id} type="button" role="menuitem" className="write-menu__item" onClick={() => choose(() => onEdit?.(m))}>
              <span className="write-menu__icon" aria-hidden>
                <PenIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-xs tracking-wide text-ink-faint uppercase">Write on this page</span>
                <span className="block truncate text-ink">{m.title || "Untitled page"}</span>
              </span>
            </button>
          ))}
          {months.map((m) => (
            <button key={`month-${m}`} type="button" role="menuitem" className="write-menu__item" onClick={() => choose(() => onEditMonth?.(m))}>
              <span className="write-menu__icon" aria-hidden>
                <PenIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-xs tracking-wide text-ink-faint uppercase">Month page</span>
                <span className="block truncate text-ink">Rename, add a note, or remove</span>
              </span>
            </button>
          ))}
          {onPageStyle && (
            <button type="button" role="menuitem" className="write-menu__item" onClick={() => choose(() => onPageStyle(memories))}>
              <span className="write-menu__icon write-menu__icon--style" aria-hidden>
                <PaletteIcon />
              </span>
              <span className="min-w-0">
                <span className="block text-ink">Page style</span>
                <span className="block text-xs text-ink-faint">Colour and pattern of the paper</span>
              </span>
            </button>
          )}
          {onEditCover && (
            <button type="button" role="menuitem" className="write-menu__item" onClick={() => choose(onEditCover)}>
              <span className="write-menu__icon" aria-hidden>
                <PenIcon />
              </span>
              <span className="text-ink">Edit the cover &amp; title</span>
            </button>
          )}
          {onNewNote && (
            <button type="button" role="menuitem" className="write-menu__item" onClick={() => choose(onNewNote)}>
              <span className="write-menu__icon write-menu__icon--letter" aria-hidden>
                <MailIcon />
              </span>
              <span className="text-ink">Write a letter to {childName || "your little one"}</span>
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className="write-fab"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Write in the journal"
        title="Write in the journal"
      >
        <PenIcon />
      </button>
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
