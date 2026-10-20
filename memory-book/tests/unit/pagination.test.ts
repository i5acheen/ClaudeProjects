import { describe, expect, it } from "vitest";
import { paginate } from "@/lib/pagination";
import type { Journal, Memory } from "@/lib/types";

const memory = (id: string, date: string, text = "", photos = 0): Memory => ({
  id,
  date,
  text,
  tags: [],
  photos: Array.from({ length: photos }, (_, i) => ({ fileId: `${id}-${i}`, width: 1200, height: 800 })),
  createdAt: `${date}T10:00:00Z`,
  updatedAt: `${date}T10:00:00Z`,
});
const book = (memories: Memory[], extra: Partial<Journal["settings"]> = {}): Journal => ({
  version: 1,
  settings: { childName: "Ritvi", dateOfBirth: "2026-05-07", bookTitle: "Ritvi's Journal", ...extra },
  memories,
});

describe("book layout", () => {
  it("always has an even number of pages (the page-turn needs pairs)", () => {
    for (let n = 0; n < 6; n++) {
      const pages = paginate(book(Array.from({ length: n }, (_, i) => memory(`m${i}`, `2026-06-${10 + i}`, "hello"))));
      expect(pages.length % 2).toBe(0);
    }
  });

  it("keeps a two-page memory on one open spread", () => {
    const long = "A long day. ".repeat(200);
    const pages = paginate(book([memory("a", "2026-06-10", "short"), memory("b", "2026-06-11", long, 2)]));
    const first = pages.findIndex((p) => p.kind === "memory" && p.memory.id === "b");
    expect(first % 2).toBe(1); // starts on a left-hand page
    expect(pages[first + 1]).toMatchObject({ kind: "memory", continued: true });
  });

  it("puts a month page before each new month of age, unless turned off", () => {
    const memories = [memory("a", "2026-05-20", "x"), memory("b", "2026-06-10", "y"), memory("c", "2026-08-01", "z")];
    expect(paginate(book(memories)).filter((p) => p.kind === "month").map((p) => (p.kind === "month" ? p.months : -1))).toEqual([0, 1, 2]);
    expect(paginate(book(memories, { monthPages: false })).some((p) => p.kind === "month")).toBe(false);
  });

  it("shows a sealed letter as a sealed page, without its words", () => {
    const letter = { ...memory("l", "2026-06-10", "SECRET"), kind: "letter" as const, sealedUntil: "2044-05-07" };
    const page = paginate(book([letter])).find((p) => p.kind === "memory");
    expect(page).toMatchObject({ sealed: true, text: "" });
  });
});
