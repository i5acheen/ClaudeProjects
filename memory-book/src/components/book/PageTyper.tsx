"use client";

import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import type { BookSettings, Memory } from "@/lib/types";
import { pageNumber, type BookPage } from "@/lib/pagination";
import { MemoryPage } from "./BookPages";
import { PenIcon } from "@/components/ui/Icons";

/** Where a page sits on screen, relative to the reader. */
interface PageSpot {
  index: number;
  memory: Memory;
  left: number;
  top: number;
  width: number;
  height: number;
  /** The reader's height, to keep the buttons on screen. */
  areaHeight: number;
}

/** A page you can type on: a plain memory or letter (not a guided page, not a sealed letter). */
const typeable = (page: BookPage | undefined): page is Extract<BookPage, { kind: "memory" }> =>
  page?.kind === "memory" && !page.sealed && page.memory.kind !== "guided";

/** How long a page turn takes (FlipBook's flippingTime), plus a moment. */
const SETTLE_MS = 950;

/**
 * Finds the memory pages on screen and where they are, so a pen can sit on each
 * (outside the page-flip library, so tapping it never turns the page).
 */
function usePageSpots(area: RefObject<HTMLDivElement | null>, pages: BookPage[], visible: number[], enabled: boolean) {
  const [spots, setSpots] = useState<PageSpot[]>([]);
  const key = visible.join(",");

  useLayoutEffect(() => {
    const host = area.current;
    if (!enabled || !host) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      const found: PageSpot[] = [];
      for (const index of key.split(",").map(Number)) {
        const page = pages[index];
        if (!typeable(page)) continue;
        const el = host.querySelector<HTMLElement>(`.book-page[data-index="${index}"]`);
        const rect = el?.getBoundingClientRect();
        if (!rect || rect.width < 40) continue;
        found.push({
          index,
          memory: page.memory,
          left: rect.left - box.left,
          top: rect.top - box.top,
          width: rect.width,
          height: rect.height,
          areaHeight: box.height,
        });
      }
      setSpots(found);
    };
    // Hide the pens while the page turns (or the book slides), then place them.
    setSpots([]);
    let timer = window.setTimeout(measure, SETTLE_MS);
    const observer = new ResizeObserver(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(measure, 120);
    });
    observer.observe(host);
    return () => {
      window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [area, pages, key, enabled]);

  return enabled ? spots : [];
}

/** The pens on the open pages, and the page you're typing on. */
export function PagePens({
  area,
  pages,
  visible,
  settings,
  onSave,
}: {
  area: RefObject<HTMLDivElement | null>;
  pages: BookPage[];
  visible: number[];
  settings: BookSettings;
  onSave: (memory: Memory, change: { title: string; text: string }) => Promise<void>;
}) {
  const [typing, setTyping] = useState<PageSpot | null>(null);
  const spots = usePageSpots(area, pages, visible, !typing);

  return (
    <>
      {spots.map((spot) => (
        <button
          key={spot.index}
          type="button"
          className="page-pen"
          // Top-right corner, over the page's little doodle rather than its words.
          style={{ left: spot.left + spot.width - 40 - spot.width * 0.04, top: spot.top + spot.width * 0.04 }}
          onClick={() => setTyping(spot)}
          aria-label={`Type on this page${spot.memory.title ? `: ${spot.memory.title}` : ""}`}
          title="Type on this page"
        >
          <PenIcon />
        </button>
      ))}
      {typing && <PageTyper spot={typing} pages={pages} settings={settings} onSave={onSave} onClose={() => setTyping(null)} />}
    </>
  );
}

/** The page itself, with its title and words ready to type on. */
function PageTyper({
  spot,
  pages,
  settings,
  onSave,
  onClose,
}: {
  spot: PageSpot;
  pages: BookPage[];
  settings: BookSettings;
  onSave: (memory: Memory, change: { title: string; text: string }) => Promise<void>;
  onClose: () => void;
}) {
  const { memory } = spot;
  const [title, setTitle] = useState(memory.title ?? "");
  const [text, setText] = useState(memory.text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = title.trim() !== (memory.title ?? "") || text.trim() !== memory.text.trim();
  // A long memory is typed on from its first page (where the photos are).
  const firstIndex = pages.findIndex((p) => p.kind === "memory" && p.memory.id === memory.id && !p.continued);

  async function done() {
    if (!changed) return onClose();
    setSaving(true);
    setError(null);
    try {
      await onSave(memory, { title: title.trim(), text: text.trim() });
      onClose();
    } catch (e) {
      setSaving(false);
      setError(e instanceof Error ? e.message : "Couldn't save this page.");
    }
  }

  function cancel() {
    if (changed && !window.confirm("Leave this page without saving what you typed?")) return;
    onClose();
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cancel();
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void done();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="page-typer" role="dialog" aria-modal aria-label="Type on this page">
      <div className="page-typer__dim" aria-hidden />
      <div className="page-surface page-typer__page" style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}>
        <MemoryPage
          memory={memory}
          text={text}
          continued={false}
          hasMore={false}
          dateOfBirth={settings.dateOfBirth}
          childName={settings.childName}
          pageNumber={pageNumber(firstIndex >= 0 ? firstIndex : spot.index)}
          editor={{ title, text, onTitle: setTitle, onText: setText }}
        />
      </div>
      <div className="page-typer__bar" style={{ left: spot.left + spot.width / 2, top: Math.min(spot.top + spot.height + 10, spot.areaHeight - 52) }}>
        {error && <span className="page-typer__error">{error}</span>}
        <button type="button" className="chrome-button field-button !h-10" onClick={cancel} disabled={saving}>
          Cancel
        </button>
        <button type="button" className="chrome-button chrome-button--primary !h-10 !px-5" onClick={done} disabled={saving}>
          {saving ? "Saving…" : "Done"}
        </button>
      </div>
    </div>
  );
}
