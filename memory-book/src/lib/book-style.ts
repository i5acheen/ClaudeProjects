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
