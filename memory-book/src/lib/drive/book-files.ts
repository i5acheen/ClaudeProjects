import type { BookSettings, GrowthEntry, Journal, Memory, WatchedFolder } from "../types";
import { normaliseJournal, normaliseMemory } from "../repository";

/**
 * How a book is split into files in Drive (format 2):
 *
 *   book.json             the book's details: child, cover, style, growth — small
 *   memories-2026.json    every memory dated in 2026
 *   memories-2027.json    … one file per year
 *
 * A few small files instead of one big one keeps loading and saving fast for
 * years, and two people adding memories rarely touch the same file.
 *
 * These are plain functions (no Drive calls), so they're easy to test.
 */

export const FORMAT = 2;

export interface IndexContent {
  version: typeof FORMAT;
  settings: BookSettings;
  growth?: Record<string, GrowthEntry>;
  watchedFolder?: WatchedFolder;
  /** The version of the old single journal.json last merged in (see migration). */
  legacyRevision?: string;
}

export interface YearContent {
  version: typeof FORMAT;
  year: string;
  memories: Memory[];
  /** Entries that couldn't be read: kept exactly as they were, never dropped. */
  unreadable?: unknown[];
}

/** Which file a memory belongs in. */
export const yearOf = (memory: Memory): string => (/^\d{4}/.test(memory.date) ? memory.date.slice(0, 4) : "undated");

export const yearFileName = (year: string) => `memories-${year}.json`;

export function parseIndex(raw: unknown): IndexContent {
  const data = (raw ?? {}) as Partial<IndexContent>;
  const normalised = normaliseJournal({ settings: data.settings, growth: data.growth, watchedFolder: data.watchedFolder });
  return {
    version: FORMAT,
    settings: normalised.settings,
    growth: normalised.growth,
    watchedFolder: normalised.watchedFolder,
    legacyRevision: typeof data.legacyRevision === "string" ? data.legacyRevision : undefined,
  };
}

export function parseYear(raw: unknown, year: string): YearContent {
  const data = (raw ?? {}) as Partial<YearContent>;
  const memories: Memory[] = [];
  const unreadable: unknown[] = Array.isArray(data.unreadable) ? [...data.unreadable] : [];
  for (const entry of Array.isArray(data.memories) ? data.memories : []) {
    const memory = normaliseMemory(entry);
    if (memory) memories.push(memory);
    else unreadable.push(entry);
  }
  return { version: FORMAT, year, memories, unreadable: unreadable.length ? unreadable : undefined };
}

/** Two copies of the same year's file (two phones created it at once): keep every memory, newest edit wins. */
export function mergeYears(a: YearContent, b: YearContent): YearContent {
  const byId = new Map<string, Memory>();
  for (const m of [...a.memories, ...b.memories]) {
    const existing = byId.get(m.id);
    if (!existing || m.updatedAt > existing.updatedAt) byId.set(m.id, m);
  }
  const unreadable = [...(a.unreadable ?? []), ...(b.unreadable ?? [])];
  return { ...a, memories: [...byId.values()], unreadable: unreadable.length ? unreadable : undefined };
}

/** The whole book, as the app uses it. */
export function assemble(index: IndexContent, years: YearContent[]): Journal {
  const sorted = [...years].sort((x, y) => x.year.localeCompare(y.year));
  const unreadable = sorted.reduce((n, y) => n + (y.unreadable?.length ?? 0), 0);
  return {
    version: 1,
    settings: index.settings,
    growth: index.growth,
    watchedFolder: index.watchedFolder,
    memories: sorted.flatMap((y) => y.memories),
    unreadable: unreadable || undefined,
  };
}

/** The book split back into its files' contents. */
export function split(journal: Journal, legacyRevision?: string): { index: IndexContent; years: Map<string, Memory[]> } {
  const years = new Map<string, Memory[]>();
  for (const memory of journal.memories) {
    const year = yearOf(memory);
    years.set(year, [...(years.get(year) ?? []), memory]);
  }
  return {
    index: {
      version: FORMAT,
      settings: journal.settings,
      growth: journal.growth,
      watchedFolder: journal.watchedFolder,
      legacyRevision,
    },
    years,
  };
}

/**
 * Brings in memories from the old single journal.json that are new or were
 * changed there later (e.g. by an app tab left open from before the update).
 * Never removes anything.
 */
export function mergeLegacy(current: Journal, legacy: Journal): Journal {
  const byId = new Map(current.memories.map((m) => [m.id, m]));
  let changed = false;
  for (const m of legacy.memories) {
    const existing = byId.get(m.id);
    if (!existing || m.updatedAt > existing.updatedAt) {
      byId.set(m.id, m);
      changed = true;
    }
  }
  return changed ? { ...current, memories: [...byId.values()] } : current;
}

export const toJson = (value: unknown) => JSON.stringify(value, null, 2);
