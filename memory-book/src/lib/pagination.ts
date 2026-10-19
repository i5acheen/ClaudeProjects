import type { Journal, Memory } from "./types";
import { SCREEN_FORMAT, roominess, type PageFormat } from "./page-format";

/**
 * Turns a journal into an ordered list of physical book pages.
 *
 *   cover · endpaper · title page · memories… · "to be continued" · endpaper · back cover
 *
 * The page-flip library shows the cover alone, then pages in pairs, and the
 * back cover alone — so the total page count must be even. A "notes" page is
 * added when needed to make that work.
 */

export type BookPage =
  | { kind: "cover" }
  | { kind: "endpaper"; side: "front" | "back" }
  | { kind: "title" }
  | {
      kind: "memory";
      memory: Memory;
      /** The text shown on this page (long memories continue on the next page). */
      text: string;
      continued: boolean;
      hasMore: boolean;
    }
  | { kind: "notes" }
  | { kind: "end" }
  | { kind: "back" };

/**
 * Rough number of characters of handwriting that fit under the photos.
 * Generous on purpose: the page also shrinks its font a little before overflowing.
 */
const CAPACITY_BY_PHOTOS = [600, 300, 300, 240, 240];
const CONTINUATION_CAPACITY = 720;

/** Splits text at a natural break (paragraph, sentence, word) at or before `limit`. */
function splitText(text: string, limit: number): [string, string] {
  if (text.length <= limit) return [text, ""];
  const window = text.slice(0, limit);
  const minCut = Math.floor(limit * 0.6);
  const breaks = [/\n\s*\n(?=[^\n]*$)/, /[.!?…]["”’)]?\s(?=[^.!?…]*$)/, /\s(?=\S*$)/];
  for (const re of breaks) {
    const match = window.match(re);
    if (match && match.index !== undefined && match.index >= minCut) {
      const cut = match.index + match[0].length;
      return [text.slice(0, cut).trimEnd(), text.slice(cut).trimStart()];
    }
  }
  return [window, text.slice(limit)];
}

export function sortMemories(memories: Memory[]): Memory[] {
  return [...memories].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
}

export function paginate(journal: Journal, format: PageFormat = SCREEN_FORMAT): BookPage[] {
  const fit = roominess(format);
  const pages: BookPage[] = [{ kind: "cover" }, { kind: "endpaper", side: "front" }, { kind: "title" }];

  for (const memory of sortMemories(journal.memories)) {
    const capacity = Math.round(CAPACITY_BY_PHOTOS[Math.min(memory.photos.length, 4)] * fit);
    let [first, rest] = splitText(memory.text, capacity);
    pages.push({ kind: "memory", memory, text: first, continued: false, hasMore: rest.length > 0 });
    while (rest) {
      [first, rest] = splitText(rest, Math.round(CONTINUATION_CAPACITY * fit));
      pages.push({ kind: "memory", memory, text: first, continued: true, hasMore: rest.length > 0 });
    }
  }

  // cover + … + end + endpaper + back must be even.
  if ((pages.length + 3) % 2 !== 0) pages.push({ kind: "notes" });
  pages.push({ kind: "end" }, { kind: "endpaper", side: "back" }, { kind: "back" });
  return pages;
}

/** Index of the first page of each memory, for jumping from the timeline. */
export function memoryPageIndex(pages: BookPage[]): Map<string, number> {
  const index = new Map<string, number>();
  pages.forEach((page, i) => {
    if (page.kind === "memory" && !page.continued) index.set(page.memory.id, i);
  });
  return index;
}

/** Printed page number (the cover, endpapers and title page are unnumbered). */
export function pageNumber(pageIndex: number): number {
  return pageIndex - 2;
}
