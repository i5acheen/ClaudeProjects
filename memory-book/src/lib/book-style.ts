import type { BookSettings } from "./types";

/**
 * The look of the book, chosen in Settings and saved with the book in
 * journal.json: the cover style and the handwriting font.
 */

export const COVER_THEMES = {
  blush: { label: "Blush linen" },
  portrait: { label: "Modern portrait" },
  sage: { label: "Sage garden" },
  midnight: { label: "Midnight stars" },
  photo: { label: "Full photo" },
  cream: { label: "Cream & gold" },
  classic: { label: "Classic rose" },
  rainbow: { label: "Rainbow sky" },
} as const;
export type CoverTheme = keyof typeof COVER_THEMES;
export const DEFAULT_COVER: CoverTheme = "blush";

/**
 * Handwriting fonts. `scale` evens out how wide each font writes, so a page
 * holds about the same amount of text whichever font is chosen.
 */
export const HANDWRITING = {
  caveat: { label: "Caveat", sample: "light and quick", family: "var(--font-caveat)", scale: 1 },
  kalam: { label: "Kalam", sample: "round and friendly", family: "var(--font-kalam)", scale: 0.78 },
  patrick: { label: "Patrick Hand", sample: "neat print", family: "var(--font-patrick)", scale: 0.86 },
  indie: { label: "Indie Flower", sample: "playful", family: "var(--font-indie)", scale: 0.8 },
  lora: { label: "Lora", sample: "classic book type", family: "var(--font-lora)", scale: 0.74 },
  typewriter: { label: "Typewriter", sample: "old letters", family: "var(--font-courier)", scale: 0.66 },
} as const;
export type Handwriting = keyof typeof HANDWRITING;
export const DEFAULT_HANDWRITING: Handwriting = "caveat";

/**
 * Cover cloth colours, after the Odd Giraffe photobook range. Any cover style
 * can be made in any of them; "none" keeps the style's own colour.
 */
export const COVER_COLORS = {
  cream: { label: "Cream", hex: "#fffaf2" },
  ivory: { label: "Ivory", hex: "#f5f3e8" },
  linen: { label: "Linen", hex: "#fcf3e9" },
  sand: { label: "Sand", hex: "#e0d0c1" },
  blush: { label: "Blush", hex: "#eed4da" },
  peach: { label: "Peach", hex: "#f0ccbe" },
  rose: { label: "Dusty rose", hex: "#d9a998" },
  terracotta: { label: "Terracotta", hex: "#cf6c54" },
  lavender: { label: "Lavender", hex: "#cfc3e0" },
  periwinkle: { label: "Periwinkle", hex: "#bec0e1" },
  sky: { label: "Sky", hex: "#98b9e0" },
  denim: { label: "Denim", hex: "#546eae" },
  olive: { label: "Olive", hex: "#b8b688" },
  sage: { label: "Sage", hex: "#b5b69f" },
  mustard: { label: "Mustard", hex: "#b87e20" },
  forest: { label: "Forest", hex: "#0c5042" },
  teal: { label: "Deep teal", hex: "#26454d" },
  navy: { label: "Slate blue", hex: "#4c617f" },
  charcoal: { label: "Charcoal", hex: "#302e2f" },
} as const;
export type CoverColor = keyof typeof COVER_COLORS;

export function coverColor(settings: Pick<BookSettings, "coverColor">): CoverColor | undefined {
  return settings.coverColor && settings.coverColor in COVER_COLORS ? settings.coverColor : undefined;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Perceived lightness, 0 (black) to 1 (white). */
function lightness(hex: string) {
  const [r, g, b] = rgb(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mix a colour towards black (amount < 0) or white (amount > 0). */
function shade(hex: string, amount: number) {
  const target = amount < 0 ? 0 : 255;
  const [r, g, b] = rgb(hex).map((c) => Math.round(c + (target - c) * Math.abs(amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * CSS variables that recolour a cover's cloth. The lettering is printed in a
 * deep shade of the cloth on light colours, and in cream on dark ones, so it
 * always reads well.
 */
export function coverColorStyle(color: CoverColor | undefined): Record<string, string> | undefined {
  if (!color) return undefined;
  const hex = COVER_COLORS[color].hex;
  const dark = lightness(hex) < 0.3;
  // Near-white cloths get a warm brown, like ink on cotton; others a deep tone of their own colour.
  const ink = dark ? "#f4e6c8" : lightness(hex) > 0.75 ? "#5b4434" : shade(hex, -0.62);
  return {
    "--cloth": hex,
    "--cover-ink": ink,
    "--cover-rule": dark ? "rgba(244, 230, 200, 0.5)" : "color-mix(in srgb, currentColor 45%, transparent)",
    "--cover-emboss": dark
      ? "0 -0.12cqw 0 rgba(0, 0, 0, 0.4), 0 0.12cqw 0 rgba(255, 240, 210, 0.12)"
      : "0 0.15cqw 0 rgba(255, 255, 255, 0.55), 0 -0.1cqw 0 rgba(0, 0, 0, 0.15)",
    "--spine-shade": dark ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.16)",
    "--cover-mat": dark ? "#f7efe0" : "#fffdf8",
    // On a full-photo cover, the title label is made in the colour.
    "--label-cloth": hex,
    "--label-ink": ink,
  };
}

/**
 * Paper for the pages: the whole book has one, and any page can have its own.
 * `pattern` is drawn under the words and photos.
 */
export const PAGE_STYLES = {
  cream: { label: "Cotton cream", paper: "#fffbf4", pattern: null },
  white: { label: "Bright white", paper: "#ffffff", pattern: null },
  lined: { label: "Lined", paper: "#fffdf7", pattern: "lined" },
  dotted: { label: "Dot grid", paper: "#fffcf6", pattern: "dots" },
  grid: { label: "Graph", paper: "#fdfcf7", pattern: "grid" },
  kraft: { label: "Kraft", paper: "#e7d5b8", pattern: null },
  blush: { label: "Blush", paper: "#fcefed", pattern: null },
  mint: { label: "Mint", paper: "#eef4ec", pattern: null },
  sky: { label: "Sky", paper: "#edf3f8", pattern: null },
  butter: { label: "Butter", paper: "#fdf6dc", pattern: null },
  vintage: { label: "Vintage", paper: "#f4e8d0", pattern: "aged" },
} as const;
export type PageStyle = keyof typeof PAGE_STYLES;
export const DEFAULT_PAGE_STYLE: PageStyle = "cream";

export const isPageStyle = (value: unknown): value is PageStyle => typeof value === "string" && value in PAGE_STYLES;

export function pageStyle(settings: Pick<BookSettings, "pageStyle">): PageStyle {
  return isPageStyle(settings.pageStyle) ? settings.pageStyle : DEFAULT_PAGE_STYLE;
}

// Lines and dots never thinner than a pixel, so they show on the little sample sheets too.
const LINE = "max(1px, 0.18cqw)";
const CELL = "max(7px, 5cqw)";
const PATTERNS: Record<string, { image: string; size: string }> = {
  // Ruled lines across the page, like an exercise book.
  lined: {
    image: `linear-gradient(to bottom, transparent calc(100% - ${LINE}), rgba(111, 147, 174, 0.3) calc(100% - ${LINE}))`,
    size: `100% max(9px, 6.2cqw)`,
  },
  dots: {
    image: "radial-gradient(circle, rgba(90, 70, 50, 0.28) max(0.8px, 0.32cqw), transparent max(1.2px, 0.42cqw))",
    size: `${CELL} ${CELL}`,
  },
  grid: {
    image: `linear-gradient(to right, rgba(111, 147, 174, 0.2) ${LINE}, transparent ${LINE}), linear-gradient(to bottom, rgba(111, 147, 174, 0.2) ${LINE}, transparent ${LINE})`,
    size: `${CELL} ${CELL}`,
  },
  // Darker, foxed edges like an old album.
  aged: {
    image: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(150, 105, 50, 0.22) 100%)",
    size: "100% 100%",
  },
};

/** CSS variables for a paper style, set on the book (whole book) or on one page. */
export function pageStyleVars(style: PageStyle): Record<string, string> {
  const { paper, pattern } = PAGE_STYLES[style];
  const p = pattern ? PATTERNS[pattern] : null;
  return {
    "--paper": paper,
    "--page-pattern": p?.image ?? "none",
    "--page-pattern-size": p?.size ?? "auto",
    // Ruled or squared paper already has lines, so the words don't draw their own.
    "--text-rule": pattern === "lined" || pattern === "grid" || pattern === "dots" ? "transparent" : "rgba(111, 147, 174, 0.22)",
  };
}

export function coverTheme(settings: Pick<BookSettings, "coverTheme">): CoverTheme {
  return settings.coverTheme && settings.coverTheme in COVER_THEMES ? settings.coverTheme : DEFAULT_COVER;
}

export function handwriting(settings: Pick<BookSettings, "handwriting">): Handwriting {
  return settings.handwriting && settings.handwriting in HANDWRITING ? settings.handwriting : DEFAULT_HANDWRITING;
}

/** CSS variables that switch the handwriting font everywhere below the element they're set on. */
export function handwritingStyle(settings: Pick<BookSettings, "handwriting">): Record<string, string> {
  const font = HANDWRITING[handwriting(settings)];
  return {
    "--font-hand": `${font.family}, "Segoe Print", "Bradley Hand", cursive`,
    "--hand-scale": String(font.scale),
  };
}
