import { describe, expect, it } from "vitest";
import { assemble, mergeLegacy, mergeYears, parseIndex, parseYear, split, yearOf } from "@/lib/drive/book-files";
import type { Journal, Memory } from "@/lib/types";

const m = (id: string, date: string, updatedAt = `${date}T00:00:00Z`, text = id): Memory => ({ id, date, text, tags: [], photos: [], createdAt: updatedAt, updatedAt });
const journal: Journal = {
  version: 1,
  settings: { childName: "Ritvi", dateOfBirth: "2026-05-07", bookTitle: "Book" },
  memories: [m("a", "2026-06-01"), m("b", "2027-01-02"), m("c", "2026-12-31")],
  growth: { "1": { height: "55 cm" } },
};

describe("book split into files", () => {
  it("puts each memory in its year's file and gets the same book back", () => {
    const { index, years } = split(journal);
    expect([...years.keys()].sort()).toEqual(["2026", "2027"]);
    const back = assemble(index, [...years].map(([year, memories]) => ({ version: 2 as const, year, memories })));
    expect(back.memories.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
    expect(back.settings).toEqual(journal.settings);
    expect(back.growth).toEqual(journal.growth);
  });

  it("files memories without a proper date as 'undated'", () => {
    expect(yearOf(m("x", "someday"))).toBe("undated");
  });

  it("keeps damaged entries untouched instead of dropping them", () => {
    const year = parseYear({ memories: [m("ok", "2026-06-01"), { nonsense: true }, null] }, "2026");
    expect(year.memories.map((x) => x.id)).toEqual(["ok"]);
    expect(year.unreadable).toHaveLength(2);
    expect(assemble(parseIndex({ settings: journal.settings }), [year]).unreadable).toBe(2);
  });

  it("merges two copies of a year: every memory kept, newest edit wins", () => {
    const one = { version: 2 as const, year: "2026", memories: [m("a", "2026-06-01", "2026-06-01T00:00:00Z", "old"), m("b", "2026-07-01")] };
    const two = { version: 2 as const, year: "2026", memories: [m("a", "2026-06-01", "2026-06-02T00:00:00Z", "new"), m("c", "2026-08-01")] };
    const merged = mergeYears(one, two);
    expect(merged.memories.map((x) => x.id).sort()).toEqual(["a", "b", "c"]);
    expect(merged.memories.find((x) => x.id === "a")?.text).toBe("new");
  });

  it("brings in memories from the old journal.json without removing any", () => {
    const legacy: Journal = { ...journal, memories: [m("a", "2026-06-01"), m("d", "2026-09-09")] };
    const merged = mergeLegacy(journal, legacy);
    expect(merged.memories.map((x) => x.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(mergeLegacy(journal, { ...journal, memories: [] })).toBe(journal);
  });

  it("survives a hand-edited book.json", () => {
    const index = parseIndex({ settings: { childName: 42 }, growth: "nonsense" });
    expect(index.settings.bookTitle).toBe("Memory Book");
    expect(index.growth).toBeUndefined();
  });
});
