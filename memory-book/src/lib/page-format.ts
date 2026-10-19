/**
 * Page shapes. Everything on a page is sized in `cqw` (1% of the page
 * width), so only the page height changes between formats: on a squarer
 * page the photos and the amount of text per page shrink to fit.
 */

export interface PageFormat {
  id: "screen" | "a4" | "square";
  label: string;
  /** Page height as a percentage of its width. */
  heightCqw: number;
  /** Printed size, for @page. */
  print?: { width: string; height: string };
}

export const SCREEN_FORMAT: PageFormat = { id: "screen", label: "Screen", heightCqw: (100 * 4) / 3 };

export const PRINT_FORMATS: PageFormat[] = [
  { id: "a4", label: "A4 (21 × 29.7 cm)", heightCqw: 100 * Math.SQRT2, print: { width: "210mm", height: "297mm" } },
  { id: "square", label: "Square 8 × 8 in (20.3 cm)", heightCqw: 100, print: { width: "8in", height: "8in" } },
];

/** Space left for photos and text after margins, header and footer (in cqw). */
const usableHeight = (format: PageFormat) => format.heightCqw - 44;

/** How much roomier (>1) or tighter (<1) a format is than the on-screen page. */
export function roominess(format: PageFormat): number {
  return usableHeight(format) / usableHeight(SCREEN_FORMAT);
}
