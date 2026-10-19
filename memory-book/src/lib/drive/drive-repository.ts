import type { BookSettings, Journal } from "../types";
import {
  emptyJournal,
  normaliseJournal,
  type BookAccess,
  type FamilyMember,
  type FamilyRole,
  type JournalRepository,
} from "../repository";
import {
  addPermission,
  getFileAccess,
  listPermissions,
  removePermission,
  appPropertyQuery,
  createFile,
  createFolder,
  downloadFile,
  downloadRevision,
  findFiles,
  headRevision,
  listRevisionIds,
  inFolderQuery,
  isPublicPermission,
  listOwnedFiles,
  listPublicFiles,
  trashFile,
  updateFileContent,
  updateMetadata,
} from "./client";

/**
 * The book in Google Drive:
 *
 *   Memory Book – <child name>/
 *   ├─ journal.json      all text, dates, tags and photo IDs
 *   └─ photos/           one JPEG per photo
 *
 * Files are found again by hidden "appProperties" tags, so renaming or
 * moving the folder in Drive doesn't break anything.
 */

const KEY = "memoryBook";

interface Location {
  folderId: string;
  photosFolderId: string;
  journalFileId: string;
  /** Older photos have had "editors can share" switched off. */
  sharingLocked?: boolean;
}

/** Marks a book whose older files have been locked against re-sharing. */
const SHARING_LOCKED = "memoryBookSharingLocked";

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

  /**
   * Saves a change to the journal without losing anyone else's.
   *
   * Two people (or two phones) can save at the same moment. So: read an exact
   * version, apply the change, write, then look at the file's version history.
   * If someone else's save landed between our read and our write, our write
   * replaced it — so apply our change again on top of their version and write
   * once more. Both changes end up in the book.
   */
  async update(change: (journal: Journal) => Journal): Promise<Journal> {
    const location = await this.requireLocation();
    const id = location.journalFileId;
    let base = await this.snapshot(id).catch(() => null);
    const latest = base?.journal ?? (await this.read(location));
    let next = change(latest);

    for (let attempt = 0; ; attempt++) {
      const written = await updateFileContent(id, jsonBlob(next));
      if (!base || !written || attempt >= 4) break;
      const history = await listRevisionIds(id).catch(() => null);
      const at = history?.indexOf(written) ?? -1;
      if (!history || at <= 0 || history[at - 1] === base.revision) break;
      // Someone else saved in between: rebuild on top of their version.
      const theirs = history[at - 1];
      next = change(normaliseJournal(JSON.parse(await (await downloadRevision(id, theirs)).text())));
      base = { revision: written, journal: next };
    }

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

  async bookFolderIds(): Promise<string[]> {
    const location = await this.requireLocation();
    return [location.folderId, location.photosFolderId];
  }

  async access(): Promise<BookAccess> {
    const location = await this.requireLocation();
    const access = await getFileAccess(location.journalFileId);
    const owner = access.owners?.[0];
    return {
      isOwner: access.ownedByMe,
      canEdit: access.capabilities?.canEdit ?? access.ownedByMe,
      ownerName: owner?.displayName ?? owner?.emailAddress,
    };
  }

  async listFamily(): Promise<FamilyMember[]> {
    const location = await this.requireLocation();
    const permissions = await listPermissions(location.folderId);
    return permissions
      .filter((p) => p.type === "user" && p.emailAddress && (p.role === "reader" || p.role === "writer" || p.role === "commenter"))
      .map((p) => ({
        id: p.id,
        email: p.emailAddress!,
        name: p.displayName,
        role: p.role === "writer" ? "writer" : "reader",
      }));
  }

  async inviteFamily(email: string, role: FamilyRole, message: string): Promise<void> {
    const location = await this.requireLocation();
    // Sharing the folder shares everything in it: journal.json and the photos.
    await addPermission(location.folderId, email, role, message);
  }

  async removeFamily(memberId: string): Promise<void> {
    const location = await this.requireLocation();
    await removePermission(location.folderId, memberId);
  }

  /**
   * Keeps the book private (book owner only):
   * - family who can add memories can't share it onwards, and
   * - any "anyone with the link" or whole-organisation sharing is removed.
   * Returns how many such public shares were removed.
   */
  async secureSharing(): Promise<{ removedPublicShares: number }> {
    const location = await this.requireLocation();
    const core = [location.folderId, location.photosFolderId, location.journalFileId];
    await Promise.all(core.map((id) => updateMetadata(id, { writersCanShare: false }).catch(() => undefined)));

    // Once per book: lock the photos added before this protection existed.
    if (!location.sharingLocked) {
      const photos = await listOwnedFiles(location.photosFolderId);
      for (let i = 0; i < photos.length; i += 8) {
        await Promise.all(photos.slice(i, i + 8).map((p) => updateMetadata(p.id, { writersCanShare: false }).catch(() => undefined)));
      }
      await updateMetadata(location.folderId, { appProperties: { [SHARING_LOCKED]: "1" } });
      location.sharingLocked = true;
    }

    const suspects = new Set([...core, ...(await listPublicFiles([location.folderId, location.photosFolderId])).map((f) => f.id)]);
    let removedPublicShares = 0;
    for (const fileId of suspects) {
      const permissions = await listPermissions(fileId).catch(() => []);
      for (const permission of permissions.filter(isPublicPermission)) {
        await removePermission(fileId, permission.id);
        removedPublicShares++;
      }
    }
    return { removedPublicShares };
  }

  folderUrl(): string | null {
    return this.location ? `https://drive.google.com/drive/folders/${this.location.folderId}` : null;
  }

  /* -------------------------------------------------------------- */

  /** The journal's current version ID and exactly that version's contents. */
  private async snapshot(fileId: string): Promise<{ revision: string; journal: Journal } | null> {
    const revision = await headRevision(fileId);
    if (!revision) return null;
    const journal = normaliseJournal(JSON.parse(await (await downloadRevision(fileId, revision)).text()));
    return { revision, journal };
  }

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

    // Your own book first (oldest, if two were ever made); otherwise one shared with you by family.
    const [own] = await findFiles(`${appPropertyQuery(KEY, "root")} and 'me' in owners`);
    const folder = own ?? (await findFiles(`${appPropertyQuery(KEY, "root")} and sharedWithMe`).catch(() => []))[0];
    if (!folder) return null;

    const children = await findFiles(inFolderQuery(folder.id));
    let photos = children.find((f) => f.appProperties?.[KEY] === "photos");
    const journal = children.find((f) => f.appProperties?.[KEY] === "journal");

    // Repair a half-created book (e.g. the connection dropped during setup).
    if (!photos) photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    if (!journal) return null;

    this.location = {
      folderId: folder.id,
      photosFolderId: photos.id,
      journalFileId: journal.id,
      sharingLocked: folder.appProperties?.[SHARING_LOCKED] === "1",
    };
    return this.location;
  }
}
