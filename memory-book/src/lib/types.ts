/**
 * The shape of everything stored in `journal.json`.
 * Kept deliberately plain (no classes) so it serialises to/from Drive as-is,
 * and so a future multi-user backend can store the same document per book.
 */

export const TAGS = ["First", "Milestone", "Festival", "Family", "Funny"] as const;
export type Tag = (typeof TAGS)[number];

export interface PhotoRef {
  /** Google Drive file ID, or `demo:<file>` for bundled demo photos. */
  fileId: string;
  width: number;
  height: number;
}

export interface Memory {
  id: string;
  /** Calendar date of the memory, `YYYY-MM-DD` (no time zone). */
  date: string;
  title?: string;
  text: string;
  tags: Tag[];
  photos: PhotoRef[];
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
}

export interface Journal {
  version: 1;
  settings: BookSettings;
  memories: Memory[];
}
