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
  space: { label: "Space adventure" },
  ocean: { label: "Under the sea" },
  garden: { label: "Garden friends" },
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
 * Paper for the pages: a colour and a pattern, chosen separately. The whole
 * book has one, and any page can have its own.
 */
export const PAPER_COLORS = {
  cream: { label: "Cream", paper: "#fffbf4" },
  white: { label: "White", paper: "#ffffff" },
  butter: { label: "Butter", paper: "#fff6d6" },
  peach: { label: "Peach", paper: "#ffefe4" },
  blush: { label: "Blush", paper: "#fdeced" },
  lilac: { label: "Lilac", paper: "#f2edfc" },
  sky: { label: "Sky", paper: "#e9f3fc" },
  mint: { label: "Mint", paper: "#e9f6ed" },
  sage: { label: "Sage", paper: "#e9efe0" },
  kraft: { label: "Kraft", paper: "#e7d5b8" },
  vintage: { label: "Vintage", paper: "#f4e8d0" },
} as const;
export type PaperColor = keyof typeof PAPER_COLORS;

export const PAPER_PATTERNS = {
  plain: { label: "Plain" },
  lined: { label: "Lined" },
  dots: { label: "Dot grid" },
  grid: { label: "Graph" },
  stars: { label: "Stars" },
  clouds: { label: "Clouds" },
  polka: { label: "Polka dots" },
  hearts: { label: "Hearts" },
  gingham: { label: "Gingham" },
  aged: { label: "Old album" },
} as const;
export type PaperPattern = keyof typeof PAPER_PATTERNS;

/** A coloured border around the page, with the writing area inside it. */
export const PAPER_FRAMES = {
  none: { label: "No frame", color: "transparent" },
  sun: { label: "Sunny", color: "#ffd86b" },
  sky: { label: "Sky", color: "#a8d4f5" },
  blush: { label: "Blush", color: "#f7b8c4" },
  mint: { label: "Mint", color: "#a8dcc0" },
  lilac: { label: "Lilac", color: "#cbbcf2" },
} as const;
export type PaperFrame = keyof typeof PAPER_FRAMES;

export interface Paper {
  color: PaperColor;
  pattern: PaperPattern;
  /** Leave out (or "none") for no frame. */
  frame?: PaperFrame;
}
export const DEFAULT_PAPER: Paper = { color: "cream", pattern: "plain" };

/** The earlier single paper choices, for books saved before colour and pattern were separate. */
export const PAGE_STYLES = {
  cream: { color: "cream", pattern: "plain" },
  white: { color: "white", pattern: "plain" },
  lined: { color: "cream", pattern: "lined" },
  dotted: { color: "cream", pattern: "dots" },
  grid: { color: "cream", pattern: "grid" },
  kraft: { color: "kraft", pattern: "plain" },
  blush: { color: "blush", pattern: "plain" },
  mint: { color: "mint", pattern: "plain" },
  sky: { color: "sky", pattern: "plain" },
  butter: { color: "butter", pattern: "plain" },
  vintage: { color: "vintage", pattern: "aged" },
} as const satisfies Record<string, Paper>;
export type PageStyle = keyof typeof PAGE_STYLES;

export const isPageStyle = (value: unknown): value is PageStyle => typeof value === "string" && value in PAGE_STYLES;

export function isPaper(value: unknown): value is Paper {
  const p = value as Partial<Paper> | null;
  return (
    !!p &&
    typeof p === "object" &&
    typeof p.color === "string" &&
    p.color in PAPER_COLORS &&
    typeof p.pattern === "string" &&
    p.pattern in PAPER_PATTERNS &&
    (p.frame === undefined || (typeof p.frame === "string" && p.frame in PAPER_FRAMES))
  );
}

const fromSaved = (paper: unknown, legacy: unknown): Paper | undefined =>
  isPaper(paper)
    ? { color: paper.color, pattern: paper.pattern, ...(paper.frame && paper.frame !== "none" ? { frame: paper.frame } : {}) }
    : isPageStyle(legacy)
      ? { ...PAGE_STYLES[legacy] }
      : undefined;

/** The whole book's paper. */
export function bookPaper(settings: Pick<BookSettings, "paper" | "pageStyle">): Paper {
  return fromSaved(settings.paper, settings.pageStyle) ?? DEFAULT_PAPER;
}

/** A page's own paper, if it has one. */
export function memoryPaper(memory: { paper?: unknown; pageStyle?: unknown }): Paper | undefined {
  return fromSaved(memory.paper, memory.pageStyle);
}

export const samePaper = (a?: Paper, b?: Paper) =>
  !!a && !!b && a.color === b.color && a.pattern === b.pattern && (a.frame ?? "none") === (b.frame ?? "none");

// Lines and dots never thinner than a pixel, so they show on the little sample sheets too.
const LINE = "max(1px, 0.18cqw)";
const CELL = "max(7px, 5cqw)";
const TILE = "max(46px, 20cqw)";
const svg = (body: string, w = 100, h = 100) =>
  `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>")`;
const star = (x: number, y: number, r: number) =>
  `<path d='M${x} ${y - r}L${x + r * 0.3} ${y - r * 0.3}L${x + r} ${y}L${x + r * 0.3} ${y + r * 0.3}L${x} ${y + r}L${x - r * 0.3} ${y + r * 0.3}L${x - r} ${y}L${x - r * 0.3} ${y - r * 0.3}Z'/>`;

const PATTERNS: Record<PaperPattern, { image: string; size: string } | null> = {
  plain: null,
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
  // Little twinkly stars.
  stars: {
    image: svg(`<g fill='%23f2b632' fill-opacity='.42'>${star(22, 24, 7)}${star(72, 64, 9)}${star(80, 18, 4)}${star(30, 80, 4)}</g>`),
    size: `${TILE} ${TILE}`,
  },
  // Soft clouds.
  clouds: {
    image: svg(
      "<g fill='%237ba7d1' fill-opacity='.16'><path d='M14 38a8 8 0 0 1 1-16 11 11 0 0 1 20-3 9 9 0 0 1 14 7 7 7 0 0 1 0 12z'/><path d='M58 86a7 7 0 0 1 1-14 9 9 0 0 1 17-3 7 7 0 0 1 12 6 6 6 0 0 1 0 11z'/></g>",
    ),
    size: `${TILE} ${TILE}`,
  },
  polka: {
    image: "radial-gradient(circle, rgba(232, 120, 140, 0.16) max(2.5px, 1.1cqw), transparent max(3px, 1.2cqw))",
    size: "max(14px, 7cqw) max(14px, 7cqw)",
  },
  hearts: {
    image: svg(
      "<g fill='%23e8788c' fill-opacity='.22'><path d='M25 34c-7-5-11-9-11-14a6 6 0 0 1 11-3 6 6 0 0 1 11 3c0 5-4 9-11 14z'/><path d='M74 82c-5-4-8-7-8-10a4.5 4.5 0 0 1 8-2 4.5 4.5 0 0 1 8 2c0 3-3 6-8 10z'/></g>",
    ),
    size: `${TILE} ${TILE}`,
  },
  // Picnic-blanket checks.
  gingham: {
    image:
      "linear-gradient(to right, rgba(123, 167, 209, 0.13) 50%, transparent 50%), linear-gradient(to bottom, rgba(123, 167, 209, 0.13) 50%, transparent 50%)",
    size: "max(12px, 6cqw) max(12px, 6cqw)",
  },
  // Darker, foxed edges like an old album.
  aged: {
    image: "radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(150, 105, 50, 0.22) 100%)",
    size: "100% 100%",
  },
};

/** CSS variables for a paper, set on the book (whole book) or on one page. */
export function paperVars(paper: Paper): Record<string, string> {
  const pattern = PATTERNS[paper.pattern];
  return {
    "--paper": PAPER_COLORS[paper.color].paper,
    "--page-pattern": pattern?.image ?? "none",
    "--page-pattern-size": pattern?.size ?? "auto",
    // The frame: the pattern sits on a rounded panel inset from the edges, the frame colour all around it.
    "--page-frame": PAPER_FRAMES[paper.frame ?? "none"].color,
    "--page-frame-inset": paper.frame && paper.frame !== "none" ? "3.4cqw" : "0px",
    // Ruled, dotted, squared or checked paper already has lines, so the words don't draw their own.
    "--text-rule": ["lined", "grid", "dots", "gingham"].includes(paper.pattern) ? "transparent" : "rgba(111, 147, 174, 0.22)",
  };
}

/** For the earlier single paper choices. */
export const pageStyleVars = (style: PageStyle) => paperVars(PAGE_STYLES[style]);

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
