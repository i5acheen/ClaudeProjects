import { describe, expect, it } from "vitest";
import { COVER_COLORS, coverColor, coverColorStyle, isPageStyle, pageStyle, pageStyleVars } from "@/lib/book-style";

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

describe("paper styles", () => {
  it("falls back to cotton cream", () => {
    expect(pageStyle({})).toBe("cream");
    expect(pageStyle({ pageStyle: "nope" as never })).toBe("cream");
    expect(isPageStyle("kraft")).toBe(true);
  });

  it("turns off the words' own lines on ruled, dotted and squared paper", () => {
    expect(pageStyleVars("lined")["--text-rule"]).toBe("transparent");
    expect(pageStyleVars("grid")["--text-rule"]).toBe("transparent");
    expect(pageStyleVars("cream")["--text-rule"]).not.toBe("transparent");
    expect(pageStyleVars("cream")["--page-pattern"]).toBe("none");
  });
});
