import type { BookSettings, Journal } from "../types";
import { emptyJournal, normaliseJournal, type JournalRepository } from "../repository";
import {
  appPropertyQuery,
  createFile,
  createFolder,
  downloadFile,
  findFiles,
  inFolderQuery,
  trashFile,
  updateFileContent,
  updateMetadata,
} from "./client";

/**
 * The book in Google Drive:
 *
 *   Memory Book – <child name>/
 *   ├─ journal.json      all text, dates, tags and photo IDs
 *   ├─ photos/           one JPEG per photo
 *   └─ Add photos here/  (optional) drop photos in; they become memories
 *
 * Files are found again by hidden "appProperties" tags, so renaming or
 * moving the folder in Drive doesn't break anything.
 */

const KEY = "memoryBook";

interface Location {
  folderId: string;
  photosFolderId: string;
  journalFileId: string;
}

export const DROP_FOLDER_NAME = "Add photos here";

export const folderName = (childName: string) => `Memory Book – ${childName.trim() || "my child"}`;

const jsonBlob = (journal: Journal) => new Blob([JSON.stringify(journal, null, 2)], { type: "application/json" });

export class DriveRepository implements JournalRepository {
  private location: Location | null = null;

  async load(): Promise<Journal | null> {
    const location = await this.locate();
    if (!location) return null;
    return this.read(location);
  }

  async create(settings: BookSettings): Promise<Journal> {
    // If a book already exists (e.g. set up on another device), use it.
    const existing = await this.load();
    if (existing) return existing;

    const folder = await createFolder(folderName(settings.childName), null, { [KEY]: "root" });
    const photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    const journal = emptyJournal(settings);
    const file = await createFile("journal.json", folder.id, jsonBlob(journal), { [KEY]: "journal" });
    this.location = { folderId: folder.id, photosFolderId: photos.id, journalFileId: file.id };
    return journal;
  }

  async update(change: (journal: Journal) => Journal): Promise<Journal> {
    const location = await this.requireLocation();
    const latest = await this.read(location);
    const next = change(latest);
    await updateFileContent(location.journalFileId, jsonBlob(next));

    if (next.settings.childName !== latest.settings.childName) {
      await updateMetadata(location.folderId, { name: folderName(next.settings.childName) }).catch(() => undefined);
    }
    return next;
  }

  async uploadPhoto(photo: Blob, name: string): Promise<string> {
    const location = await this.requireLocation();
    const file = await createFile(name, location.photosFolderId, photo, { [KEY]: "photo" });
    return file.id;
  }

  downloadPhoto(fileId: string): Promise<Blob> {
    return downloadFile(fileId);
  }

  removePhoto(fileId: string): Promise<void> {
    return trashFile(fileId);
  }

  async createDropFolder(): Promise<{ id: string; name: string }> {
    const location = await this.requireLocation();
    const existing = (await findFiles(inFolderQuery(location.folderId))).find((f) => f.appProperties?.[KEY] === "drop");
    if (existing) return { id: existing.id, name: existing.name };
    const folder = await createFolder(DROP_FOLDER_NAME, location.folderId, { [KEY]: "drop" });
    return { id: folder.id, name: folder.name };
  }

  folderUrl(): string | null {
    return this.location ? `https://drive.google.com/drive/folders/${this.location.folderId}` : null;
  }

  /* -------------------------------------------------------------- */

  private async read(location: Location): Promise<Journal> {
    return normaliseJournal(JSON.parse(await (await downloadFile(location.journalFileId)).text()));
  }

  private async requireLocation(): Promise<Location> {
    const location = this.location ?? (await this.locate());
    if (!location) throw new Error("No memory book found in Google Drive.");
    return location;
  }

  private async locate(): Promise<Location | null> {
    if (this.location) return this.location;

    // Oldest first, so if two were ever created we keep using the original.
    const [folder] = await findFiles(appPropertyQuery(KEY, "root"));
    if (!folder) return null;

    const children = await findFiles(inFolderQuery(folder.id));
    let photos = children.find((f) => f.appProperties?.[KEY] === "photos");
    const journal = children.find((f) => f.appProperties?.[KEY] === "journal");

    // Repair a half-created book (e.g. the connection dropped during setup).
    if (!photos) photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    if (!journal) return null;

    this.location = { folderId: folder.id, photosFolderId: photos.id, journalFileId: journal.id };
    return this.location;
  }
}
