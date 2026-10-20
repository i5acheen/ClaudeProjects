import type { BookSettings, Journal, Memory } from "./types";

/**
 * Everything the app needs from storage. Today this is Google Drive
 * (DriveRepository); a database-backed version for many users could
 * implement the same interface later without touching the UI.
 */
export interface JournalRepository {
  /** Loads the book, or returns null when this account has no book yet. */
  load(): Promise<Journal | null>;
  /**
   * Creates a new, empty book (`another`: an extra book for a second child;
   * `sameChild`: another book for the same child, told apart by its title).
   */
  create(settings: BookSettings, options?: { another?: boolean; sameChild?: boolean }): Promise<Journal>;
  /** Every book this account can open: its own (one per child) and ones shared with it. */
  listBooks(): Promise<BookSummary[]>;
  /** Which book to open (null: the first of your own). */
  selectBook(bookId: string | null): void;
  /** The ID of the book that's open, if known. */
  currentBookId(): string | null;
  /**
   * Re-reads the latest saved journal, applies `change` and saves it.
   * Re-reading first means two devices editing at once don't wipe each other out.
   */
  update(change: (journal: Journal) => Journal): Promise<Journal>;
  uploadPhoto(photo: Blob, name: string): Promise<string>;
  /** Saves the smaller screen copy of a photo; returns its ID. */
  uploadSmallCopy(copy: Blob, name: string, photoId: string): Promise<string>;
  downloadPhoto(fileId: string): Promise<Blob>;
  /** Moves a photo (and its smaller copy) to the bin. */
  removePhoto(fileId: string): Promise<void>;
  /** A link to the book's folder, if the storage has one. */
  folderUrl(): string | null;
  /** The book's own folders, which must never be watched for new photos. */
  bookFolderIds(): Promise<string[]>;
  /** Whose book this is, and whether the signed-in person may change it. */
  access(): Promise<BookAccess>;
  listFamily(): Promise<FamilyMember[]>;
  inviteFamily(email: string, role: FamilyRole, message: string): Promise<void>;
  removeFamily(memberId: string): Promise<void>;
  /** Owner only: stops onward sharing and removes public links; returns how many were removed. */
  secureSharing(): Promise<{ removedPublicShares: number }>;
  /** Owner only: keeps a weekly copy of the book's text; true if one was made now. */
  ensureBackup(journal: Journal): Promise<boolean>;
  listBackups(): Promise<{ id: string; date: string }[]>;
  /** Adds back memories from a backup that are missing now (never removes anything). */
  restoreFromBackup(backupId: string): Promise<{ journal: Journal; restored: number }>;
  /** Owner only: copies photos family added into the owner's Drive and points the book at the copies. */
  adoptFamilyPhotos(): Promise<{ adopted: number; journal?: Journal }>;
  /** Owner only: moves the whole book folder to the Drive bin (recoverable there for 30 days). */
  trashBook(): Promise<void>;
  /** Messages for the person (e.g. a damaged file was repaired), each returned once. */
  takeNotices(): string[];
}

export type FamilyRole = "reader" | "writer";

export interface BookSummary {
  id: string;
  /** The child's name. */
  childName: string;
  /** The book's title (books made before titles were recorded don't have one here). */
  title?: string;
  shared: boolean;
}

export interface FamilyMember {
  id: string;
  email: string;
  name?: string;
  role: FamilyRole;
}

export interface BookAccess {
  isOwner: boolean;
  canEdit: boolean;
  ownerName?: string;
  /** False until Google has said whose book it is. */
  known?: boolean;
}

export function emptyJournal(settings: BookSettings): Journal {
  return { version: 1, settings, memories: [] };
}

/** A readable memory from a saved file, or null if the entry is damaged. */
export function normaliseMemory(raw: unknown): Memory | null {
  const m = raw as Partial<Memory> | null;
  if (!m || typeof m !== "object" || typeof m.id !== "string" || typeof m.date !== "string") return null;
  return {
    ...(m as Memory),
    text: typeof m.text === "string" ? m.text : "",
    tags: Array.isArray(m.tags) ? m.tags : [],
    photos: Array.isArray(m.photos) ? m.photos.filter((p) => p && typeof p.fileId === "string") : [],
    createdAt: typeof m.createdAt === "string" ? m.createdAt : m.date,
    updatedAt: typeof m.updatedAt === "string" ? m.updatedAt : m.date,
  };
}

/** Defensive parse of a stored journal, so a hand-edited file can't crash the app. */
export function normaliseJournal(raw: unknown): Journal {
  const data = (raw ?? {}) as Partial<Journal>;
  const watched = data.watchedFolder;
  const settings = (data.settings ?? {}) as Partial<BookSettings>;
  return {
    version: 1,
    settings: {
      childName: settings.childName ?? "",
      dateOfBirth: settings.dateOfBirth ?? new Date().toISOString().slice(0, 10),
      bookTitle: settings.bookTitle ?? "Memory Book",
      coverPhoto: settings.coverPhoto,
      coverTheme: settings.coverTheme,
      coverColor: settings.coverColor,
      paper: settings.paper,
      pageStyle: settings.pageStyle,
      handwriting: settings.handwriting,
      dedication: settings.dedication,
      coverFocus: settings.coverFocus,
      coverLabel: settings.coverLabel,
      coverSubtitle: settings.coverSubtitle,
      monthPages: settings.monthPages,
      consent:
        settings.consent && typeof settings.consent.version === "string" && typeof settings.consent.at === "string"
          ? { version: settings.consent.version, at: settings.consent.at, guardian: true }
          : undefined,
    },
    memories: Array.isArray(data.memories)
      ? data.memories.map(normaliseMemory).filter((m): m is Memory => m !== null)
      : [],
    growth: data.growth && typeof data.growth === "object" ? data.growth : undefined,
    watchedFolder:
      watched && typeof watched.folderId === "string"
        ? {
            folderId: watched.folderId,
            folderName: watched.folderName ?? "",
            importedFileIds: Array.isArray(watched.importedFileIds) ? watched.importedFileIds : [],
            skippedFileIds: Array.isArray(watched.skippedFileIds) ? watched.skippedFileIds : [],
            lastCheckedAt: watched.lastCheckedAt,
          }
        : undefined,
  };
}
