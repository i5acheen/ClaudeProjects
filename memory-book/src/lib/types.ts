import type { CoverColor, CoverTheme, Handwriting, PageStyle, Paper } from "./book-style";

/**
 * The shape of everything stored in `journal.json`.
 * Kept deliberately plain (no classes) so it serialises to/from Drive as-is,
 * and so a future multi-user backend can store the same document per book.
 */

export const TAGS = [
  "First",
  "Milestone",
  "Festival",
  "Family",
  "Funny",
  // Indian milestones and ceremonies
  "Naamkaran",
  "Annaprashan",
  "Mundan",
  "First Diwali",
  "First Holi",
] as const;
export type Tag = (typeof TAGS)[number];

export interface PhotoRef {
  /** Google Drive file ID, or `demo:<file>` for bundled demo photos. */
  fileId: string;
  width: number;
  height: number;
  /** Visual fingerprint (see lib/photo-hash.ts), used to skip duplicates. */
  hash?: string;
  /** A smaller copy (about 1000px) in Drive, for quick pages on any device. The full photo is used for printing. */
  thumbId?: string;
}

export interface Memory {
  id: string;
  /** Calendar date of the memory, `YYYY-MM-DD` (no time zone). */
  date: string;
  title?: string;
  text: string;
  tags: Tag[];
  photos: PhotoRef[];
  /** Set when the memory was made automatically from your watched Drive folder. */
  source?: "drive-folder";
  /** The date couldn't be read from the photo, so it's only a guess — worth checking. */
  dateGuessed?: boolean;
  /** A letter to the child (words only, its own page style). */
  kind?: "letter";
  /** Time capsule: the letter stays sealed in the book until this date (`YYYY-MM-DD`). */
  sealedUntil?: string;
  /** This page's own paper (colour and pattern), instead of the book's. */
  paper?: Paper;
  /** Earlier, single paper choice (read only; `paper` replaces it). */
  pageStyle?: PageStyle;
  createdAt: string;
  updatedAt: string;
}

export interface BookSettings {
  childName: string;
  /** `YYYY-MM-DD` */
  dateOfBirth: string;
  bookTitle: string;
  coverPhoto?: PhotoRef;
  /** Short handwritten note on the title page. */
  dedication?: string;
  /** Cover style, see lib/book-style.ts. */
  coverTheme?: CoverTheme;
  /** Cover cloth colour (any style); unset keeps the style's own colour. */
  coverColor?: CoverColor;
  /** Paper (colour and pattern) for every page, unless a page has its own. */
  paper?: Paper;
  /** Earlier, single paper choice (read only; `paper` replaces it). */
  pageStyle?: PageStyle;
  /** Handwriting font, see lib/book-style.ts. */
  handwriting?: Handwriting;
  /** The point of the cover photo to keep in view (percent from left/top), e.g. the face. */
  coverFocus?: { x: number; y: number };
  /** Where the title label sits on a full-photo cover. */
  coverLabel?: "top" | "bottom";
  /** The small line under the title; empty means "for <name> · <birthday>". */
  coverSubtitle?: string;
  /** Divider pages at the start of each month of age (on unless turned off). */
  monthPages?: boolean;
  /** When the book's owner agreed to the privacy notice, confirming they're the parent or guardian. */
  consent?: { version: string; at: string; guardian: true };
}

/** The Drive folder you drop photos into, so they turn into memories by themselves. */
export interface WatchedFolder {
  folderId: string;
  folderName: string;
  /** Photos already brought into the book (so they're never added twice). */
  importedFileIds: string[];
  /** Photos that couldn't be read (e.g. a format the browser can't open). */
  skippedFileIds: string[];
  lastCheckedAt?: string;
}

/** Height and weight at a month of age, shown on that month's divider page. */
/** What you've noted for one month of age: shown on that month's divider page. */
export interface GrowthEntry {
  height?: string;
  weight?: string;
  /** Your own heading for the month page, instead of "3 months". */
  title?: string;
  /** A short line on the month page. */
  note?: string;
}

export interface Journal {
  version: 1;
  settings: BookSettings;
  memories: Memory[];
  watchedFolder?: WatchedFolder;
  /** Keyed by completed months of age ("0" = the first month). */
  growth?: Record<string, GrowthEntry>;
  /**
   * Entries in the saved files that couldn't be read (e.g. edited by hand).
   * They're kept untouched in Drive — never dropped — and counted here so the app can say so.
   */
  unreadable?: number;
}
