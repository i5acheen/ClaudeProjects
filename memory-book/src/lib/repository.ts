import type { BookSettings, Journal } from "./types";

/**
 * Everything the app needs from storage. Today this is Google Drive
 * (DriveRepository); a database-backed version for many users could
 * implement the same interface later without touching the UI.
 */
export interface JournalRepository {
  /** Loads the book, or returns null when this account has no book yet. */
  load(): Promise<Journal | null>;
  /** Creates a new, empty book. */
  create(settings: BookSettings): Promise<Journal>;
  /**
   * Re-reads the latest saved journal, applies `change` and saves it.
   * Re-reading first means two devices editing at once don't wipe each other out.
   */
  update(change: (journal: Journal) => Journal): Promise<Journal>;
  uploadPhoto(photo: Blob, name: string): Promise<string>;
  downloadPhoto(fileId: string): Promise<Blob>;
  /** Moves a photo to the bin. */
  removePhoto(fileId: string): Promise<void>;
  /** A link to the book's folder, if the storage has one. */
  folderUrl(): string | null;
  /** The book's own folders, which must never be watched for new photos. */
  bookFolderIds(): Promise<string[]>;
  /** Creates (or finds) the "Add photos here" folder inside the book folder. */
  createDropFolder(): Promise<{ id: string; name: string }>;
  /** Whose book this is, and whether the signed-in person may change it. */
  access(): Promise<BookAccess>;
  listFamily(): Promise<FamilyMember[]>;
  inviteFamily(email: string, role: FamilyRole, message: string): Promise<void>;
  removeFamily(memberId: string): Promise<void>;
}

export type FamilyRole = "reader" | "writer";

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
}

export function emptyJournal(settings: BookSettings): Journal {
  return { version: 1, settings, memories: [] };
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
      handwriting: settings.handwriting,
      dedication: settings.dedication,
    },
    memories: Array.isArray(data.memories)
      ? data.memories
          .filter((m) => m && typeof m.id === "string" && typeof m.date === "string")
          .map((m) => ({
            ...m,
            text: m.text ?? "",
            tags: Array.isArray(m.tags) ? m.tags : [],
            photos: Array.isArray(m.photos) ? m.photos : [],
          }))
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
