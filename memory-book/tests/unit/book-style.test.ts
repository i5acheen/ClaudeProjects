import { describe, expect, it } from "vitest";
import { COVER_COLORS, bookPaper, coverColor, coverColorStyle, isPaper, memoryPaper, paperVars } from "@/lib/book-style";
import { guidedAnswers, isGuidedTemplate } from "@/lib/guided";

describe("cover colours", () => {
  it("letters dark cloths in cream and light cloths in a dark tone", () => {
    expect(coverColorStyle("forest")?.["--cover-ink"]).toBe("#f4e6c8");
    expect(coverColorStyle("charcoal")?.["--cover-ink"]).toBe("#f4e6c8");
    expect(coverColorStyle("cream")?.["--cover-ink"]).toBe("#5b4434");
    expect(coverColorStyle("blush")?.["--cloth"]).toBe(COVER_COLORS.blush.hex);
  });

  it("keeps the style's own colour when none (or an unknown one) is set", () => {
    expect(coverColorStyle(undefined)).toBeUndefined();
    expect(coverColor({ coverColor: "plaid" as never })).toBeUndefined();
  });
});

describe("paper", () => {
  it("falls back to plain cream, and reads the earlier single choices", () => {
    expect(bookPaper({})).toEqual({ color: "cream", pattern: "plain" });
    expect(bookPaper({ pageStyle: "dotted" })).toEqual({ color: "cream", pattern: "dots" });
    expect(bookPaper({ pageStyle: "nope" as never })).toEqual({ color: "cream", pattern: "plain" });
    expect(memoryPaper({ pageStyle: "kraft" })).toEqual({ color: "kraft", pattern: "plain" });
    expect(memoryPaper({})).toBeUndefined();
  });

  it("prefers the new colour-and-pattern choice, and ignores damaged ones", () => {
    expect(bookPaper({ paper: { color: "sky", pattern: "clouds" }, pageStyle: "kraft" })).toEqual({ color: "sky", pattern: "clouds" });
    expect(memoryPaper({ paper: { color: "plaid", pattern: "stars" } })).toBeUndefined();
    expect(isPaper({ color: "mint", pattern: "gingham" })).toBe(true);
  });

  it("turns off the words' own lines on ruled, dotted, squared and checked paper", () => {
    expect(paperVars({ color: "cream", pattern: "lined" })["--text-rule"]).toBe("transparent");
    expect(paperVars({ color: "mint", pattern: "gingham" })["--text-rule"]).toBe("transparent");
    expect(paperVars({ color: "cream", pattern: "stars" })["--text-rule"]).not.toBe("transparent");
    expect(paperVars({ color: "sky", pattern: "plain" })).toMatchObject({ "--paper": "#e9f3fc", "--page-pattern": "none" });
  });
});

describe("page frames", () => {
  it("keeps a valid frame, drops 'none' and rejects unknown ones", () => {
    expect(memoryPaper({ paper: { color: "cream", pattern: "plain", frame: "sun" } })).toEqual({ color: "cream", pattern: "plain", frame: "sun" });
    expect(memoryPaper({ paper: { color: "cream", pattern: "plain", frame: "none" } })).toEqual({ color: "cream", pattern: "plain" });
    expect(isPaper({ color: "cream", pattern: "plain", frame: "tartan" })).toBe(false);
  });

  it("insets the pattern only when there is a frame", () => {
    expect(paperVars({ color: "cream", pattern: "plain", frame: "sky" })["--page-frame-inset"]).not.toBe("0px");
    expect(paperVars({ color: "cream", pattern: "plain" })["--page-frame-inset"]).toBe("0px");
  });
});

describe("guided pages", () => {
  it("keeps only the template's own answers, trimmed and short", () => {
    const answers = guidedAnswers("about", { toy: "  giraffe  ", food: "", hacked: "x", song: "a".repeat(500), height: 64 });
    expect(answers).toEqual({ toy: "giraffe", song: "a".repeat(120) });
  });

  it("knows its templates", () => {
    expect(isGuidedTemplate("firsts")).toBe(true);
    expect(isGuidedTemplate("rocket")).toBe(false);
  });
});
