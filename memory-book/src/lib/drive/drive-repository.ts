import type { BookSettings, Journal, PhotoRef } from "../types";
import { idbGet, idbPut } from "../idb";
import {
  FORMAT,
  assemble,
  mergeLegacy,
  parseIndex,
  parseYear,
  split,
  toJson,
  yearFileName,
  mergeYears,
  type IndexContent,
  type YearContent,
} from "./book-files";
import {
  emptyJournal,
  normaliseJournal,
  normaliseMemory,
  type BookAccess,
  type FamilyMember,
  type FamilyRole,
  type JournalRepository,
  type BookSummary,
} from "../repository";
import {
  addPermission,
  getFileAccess,
  listPermissions,
  removePermission,
  appPropertyQuery,
  copyFile,
  createFile,
  createFolder,
  downloadFile,
  downloadRevision,
  findFiles,
  headRevision,
  listRevisionIds,
  listRevisions,
  listTrashedInFolder,
  inFolderQuery,
  isPublicPermission,
  listFilesOwnedByOthers,
  listFolderFiles,
  listOwnedFiles,
  removeFromFolder,
  type DriveChild,
  listPublicFiles,
  trashFile,
  updateFileContent,
  updateMetadata,
} from "./client";

/**
 * The book in Google Drive:
 *
 *   Memory Book – <child name>/
 *   ├─ book.json            the book's details (child, cover, style, growth)
 *   ├─ memories-2026.json   the memories of each year (text, dates, tags, photo IDs)
 *   ├─ photos/              one JPEG per photo
 *   ├─ backups/             safety copies
 *   └─ journal.json         (older books) the original single file, kept as it was
 *
 * Files are found again by hidden "appProperties" tags, so renaming or
 * moving the folder in Drive doesn't break anything. See book-files.ts.
 */

const KEY = "memoryBook";
const YEAR_KEY = "memoryBookYear";
/** On a photo's smaller copy: which photo it belongs to. */
const PHOTO_KEY = "memoryBookPhoto";

interface Location {
  folderId: string;
  photosFolderId: string;
  /** book.json — or, for an older book not converted yet, journal.json. */
  journalFileId: string;
  /** "split": book.json + a file per year. "single": the original journal.json only. */
  format: "split" | "single";
  /** The original journal.json of a converted book, still merged in if an old app tab writes to it. */
  legacyFileId?: string;
  /** Older photos have had "editors can share" switched off. */
  sharingLocked?: boolean;
  backupsFolderId?: string;
  /** One of several books for the same child: its folder's name carries the book's title too. */
  titled?: boolean;
  /** Your own book from before folders recorded the child's name and the title. */
  needsLabels?: boolean;
}

/** How often a safety copy of the whole book is kept, and how many. */
const BACKUP_EVERY_DAYS = 7;
const BACKUPS_KEPT = 4;

/** One stored file, with the exact version we last read or wrote. */
interface Part<T> {
  fileId: string;
  revision?: string;
  data: T;
  /** Extra copies of the same year's file, to be tidied away on the next save. */
  extras?: string[];
}

interface BookState {
  index: Part<IndexContent>;
  years: Map<string, Part<YearContent>>;
}

/** Marks a book whose older files have been locked against re-sharing. */
const SHARING_LOCKED = "memoryBookSharingLocked";

/** Folder properties naming the child and the book (folder names alone can't tell two books for one child apart). */
const CHILD_KEY = "memoryBookChild";
const TITLE_KEY = "memoryBookTitle";
/** Set on a second (third…) book for the same child. */
const TITLED_KEY = "memoryBookTitled";

export const folderName = (childName: string, bookTitle?: string) =>
  `Memory Book – ${childName.trim() || "my child"}${bookTitle?.trim() ? ` – ${bookTitle.trim()}` : ""}`;

/** What a book folder says about itself (Drive limits a property to about 100 characters). */
const folderLabels = (settings: { childName: string; bookTitle: string }) => ({
  [CHILD_KEY]: settings.childName.slice(0, 60),
  [TITLE_KEY]: settings.bookTitle.slice(0, 60),
});

/** The child's name: from the folder's properties, or (older books) its name. */
const folderChild = (f: { name: string; appProperties?: Record<string, string> }) =>
  f.appProperties?.[CHILD_KEY] || f.name.replace(/^Memory Book – /, "");

const jsonBlob = (value: unknown) => new Blob([toJson(value)], { type: "application/json" });

/**
 * Reads a book file. A version this device has read before comes from its own
 * store instead of being downloaded again — so opening the book only downloads
 * what changed since last time.
 */
async function readJson(fileId: string, revision?: string): Promise<unknown> {
  if (revision) {
    const cached = await idbGet<{ revision: string; text: string }>("files", fileId).catch(() => undefined);
    if (cached?.revision === revision) return JSON.parse(cached.text);
  }
  const text = await (revision ? await downloadRevision(fileId, revision) : await downloadFile(fileId)).text();
  const value = JSON.parse(text);
  if (revision) await idbPut("files", fileId, { revision, text }).catch(() => undefined);
  return value;
}

/** Remembers what was just written, so it isn't downloaded again. */
const remember = (fileId: string, revision: string | undefined, content: unknown) =>
  revision ? idbPut("files", fileId, { revision, text: toJson(content) }).catch(() => undefined) : Promise.resolve();

/**
 * Writes a file, then checks Drive's version history: if someone else's save
 * landed between our read (`base`) and our write, returns their version so the
 * change can be re-applied on top of it. Both changes end up kept.
 */
async function writeChecked(fileId: string, base: string | undefined, content: unknown): Promise<{ written?: string; theirs?: string }> {
  const written = await updateFileContent(fileId, jsonBlob(content));
  await remember(fileId, written, content);
  if (!base || !written) return { written };
  const history = await listRevisionIds(fileId).catch(() => null);
  const at = history?.indexOf(written) ?? -1;
  if (!history || at <= 0 || history[at - 1] === base) return { written };
  return { written, theirs: history[at - 1] };
}

const today = () => new Date().toISOString().slice(0, 10);
const isDamaged = (e: unknown) => e instanceof SyntaxError;

export class DriveRepository implements JournalRepository {
  private location: Location | null = null;
  /** The book chosen in the switcher (one per child); null opens the first of your own. */
  private preferredBook: string | null = null;

  selectBook(bookId: string | null) {
    if (bookId === this.preferredBook) return;
    this.preferredBook = bookId;
    this.location = null;
  }

  currentBookId(): string | null {
    return this.location?.folderId ?? this.preferredBook;
  }

  async listBooks(): Promise<BookSummary[]> {
    const own = await findFiles(`${appPropertyQuery(KEY, "root")} and 'me' in owners`);
    const shared = await findFiles(`${appPropertyQuery(KEY, "root")} and sharedWithMe`).catch(() => []);
    const summary = (f: { id: string; name: string; appProperties?: Record<string, string> }, isShared: boolean) => ({
      id: f.id,
      childName: folderChild(f),
      title: f.appProperties?.[TITLE_KEY] || undefined,
      shared: isShared,
    });
    return [...own.map((f) => summary(f, false)), ...shared.map((f) => summary(f, true))];
  }
  /** Things the app should tell you about (e.g. a damaged file that was repaired). */
  private notices: string[] = [];

  takeNotices(): string[] {
    const notices = this.notices;
    this.notices = [];
    return notices;
  }

  async load(): Promise<Journal | null> {
    const location = await this.locate();
    if (!location) return null;
    if (location.format === "single") return this.readSingle(location);
    const state = await this.readState(location);
    let journal = assemble(state.index.data, [...state.years.values()].map((p) => p.data));
    if (location.legacyFileId) journal = await this.catchUpLegacy(location, journal, state.index.data.legacyRevision);
    if (location.needsLabels) {
      // So the book switcher can show this book's title.
      location.needsLabels = false;
      await updateMetadata(location.folderId, { appProperties: folderLabels(journal.settings) }).catch(() => undefined);
    }
    return journal;
  }

  async create(settings: BookSettings, options: { another?: boolean; sameChild?: boolean } = {}): Promise<Journal> {
    // If a book already exists (e.g. set up on another device), use it — unless this is an extra book.
    if (!options.another && !options.sameChild) {
      const existing = await this.load();
      if (existing) return existing;
    }

    const titled = !!options.sameChild;
    const folder = await createFolder(folderName(settings.childName, titled ? settings.bookTitle : undefined), null, {
      [KEY]: "root",
      ...folderLabels(settings),
      ...(titled ? { [TITLED_KEY]: "1" } : {}),
    });
    const photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    const journal = emptyJournal(settings);
    const index = await createFile("book.json", folder.id, jsonBlob(split(journal).index), { [KEY]: "index" });
    this.location = { folderId: folder.id, photosFolderId: photos.id, journalFileId: index.id, format: "split", titled };
    this.preferredBook = folder.id;
    return journal;
  }

  /**
   * Saves a change to the book without losing anyone else's.
   *
   * Only the files that actually changed are written (usually one year's file).
   * If someone else saved one of them at the same moment, the change is applied
   * again on top of their version and written once more — both are kept.
   */
  async update(change: (journal: Journal) => Journal): Promise<Journal> {
    const location = await this.requireLocation();
    if (location.format === "single") return this.updateSingle(location, change);

    const state = await this.readState(location);
    const before = assemble(state.index.data, [...state.years.values()].map((p) => p.data));
    let next = before;
    for (let attempt = 0; attempt < 5; attempt++) {
      next = change(assemble(state.index.data, [...state.years.values()].map((p) => p.data)));
      const plan = split(next, state.index.data.legacyRevision);
      let conflicts = 0;

      if (toJson(plan.index) !== toJson(state.index.data)) {
        const result = await writeChecked(state.index.fileId, state.index.revision, plan.index);
        if (result.theirs) {
          state.index = { ...state.index, revision: result.written, data: parseIndex(await readJson(state.index.fileId, result.theirs)) };
          conflicts++;
        } else {
          state.index = { ...state.index, revision: result.written, data: plan.index };
          // An always-current spare copy of the book's details, used if book.json is ever lost.
          await this.saveDetailsCopy(location, plan.index).catch(() => undefined);
        }
      }

      for (const year of new Set([...state.years.keys(), ...plan.years.keys()])) {
        const memories = plan.years.get(year) ?? [];
        const part = state.years.get(year);
        if (!part) {
          if (memories.length === 0) continue;
          const content: YearContent = { version: FORMAT, year, memories };
          const file = await createFile(yearFileName(year), location.folderId, jsonBlob(content), { [KEY]: "year", [YEAR_KEY]: year });
          state.years.set(year, { fileId: file.id, revision: await headRevision(file.id).catch(() => undefined), data: content });
          continue;
        }
        if (toJson(memories) === toJson(part.data.memories) && !part.extras?.length) continue;
        const content: YearContent = { ...part.data, memories };
        const result = await writeChecked(part.fileId, part.revision, content);
        if (result.theirs) {
          state.years.set(year, { ...part, revision: result.written, data: parseYear(await readJson(part.fileId, result.theirs), year) });
          conflicts++;
        } else {
          state.years.set(year, { fileId: part.fileId, revision: result.written, data: content });
          // Spare copies of this year's file were merged in; tidy them away.
          await Promise.all((part.extras ?? []).map((id) => trashFile(id).catch(() => undefined)));
        }
      }
      if (conflicts === 0) break;
    }

    const { childName, bookTitle } = next.settings;
    if (childName !== before.settings.childName || bookTitle !== before.settings.bookTitle) {
      await updateMetadata(location.folderId, {
        name: folderName(childName, location.titled ? bookTitle : undefined),
        appProperties: folderLabels(next.settings),
      }).catch(() => undefined);
    }
    return next;
  }

  async uploadPhoto(photo: Blob, name: string): Promise<string> {
    const location = await this.requireLocation();
    const file = await createFile(name, location.photosFolderId, photo, { [KEY]: "photo" });
    return file.id;
  }

  async uploadSmallCopy(copy: Blob, name: string, photoId: string): Promise<string> {
    const location = await this.requireLocation();
    const file = await createFile(name, location.photosFolderId, copy, { [KEY]: "small", [PHOTO_KEY]: photoId });
    return file.id;
  }

  downloadPhoto(fileId: string): Promise<Blob> {
    return downloadFile(fileId);
  }

  async removePhoto(fileId: string): Promise<void> {
    await trashFile(fileId);
    const copies = await findFiles(appPropertyQuery(PHOTO_KEY, fileId)).catch(() => []);
    await Promise.all(copies.map((c) => trashFile(c.id).catch(() => undefined)));
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
    const core = [location.folderId, location.photosFolderId, location.journalFileId, ...(location.legacyFileId ? [location.legacyFileId] : [])];
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

  async trashBook(): Promise<void> {
    const location = await this.requireLocation();
    await trashFile(location.folderId);
    this.location = null;
  }

  folderUrl(): string | null {
    return this.location ? `https://drive.google.com/drive/folders/${this.location.folderId}` : null;
  }

  /* -------------------------------------------------------------- */

  /** Every file of a split book, each with the exact version read. */
  private async readState(location: Location): Promise<BookState> {
    // One listing gives every file's current version; only changed ones are downloaded.
    const files = await listFolderFiles(location.folderId);
    const versions = new Map(files.map((f) => [f.id, f.headRevisionId]));
    const read = async <T,>(fileId: string, parse: (raw: unknown) => T, name: string): Promise<Part<T>> => {
      const revision = versions.get(fileId) ?? (await headRevision(fileId).catch(() => undefined));
      try {
        return { fileId, revision, data: parse(await readJson(fileId, revision)) };
      } catch (e) {
        if (!isDamaged(e)) throw e;
        return this.repair(location, fileId, revision, parse, name);
      }
    };
    const index = await read(location.journalFileId, parseIndex, "book.json");
    const years = new Map<string, Part<YearContent>>();
    for (const file of files.filter((f) => f.appProperties?.[KEY] === "year")) {
      const year = file.appProperties?.[YEAR_KEY] ?? file.name.replace(/^memories-|\.json$/g, "");
      const part = await read(file.id, (raw) => parseYear(raw, year), file.name);
      const existing = years.get(year);
      if (!existing) years.set(year, part);
      else
        years.set(year, {
          // Two copies of one year (made at the same moment on two phones): keep everything in the first.
          ...existing,
          data: mergeYears(existing.data, part.data),
          extras: [...(existing.extras ?? []), part.fileId],
        });
    }
    return { index, years };
  }

  /**
   * A file that can't be read (damaged, or edited by hand): put back its last
   * good version from Drive's history, keeping the damaged copy in backups/.
   * Nothing is thrown away.
   */
  private async repair<T>(location: Location, fileId: string, head: string | undefined, parse: (raw: unknown) => T, name: string): Promise<Part<T>> {
    const damagedText = await (await downloadFile(fileId)).text().catch(() => "");
    // Keep the damaged file exactly as it is, first.
    const kept = await this.backupsFolder(location)
      .then((backups) => copyFile(fileId, `damaged-${name.replace(/\.json$/, "")}-${today()}.json`, backups, { [KEY]: "damaged" }))
      .then(() => true)
      .catch(() => false);
    const history = await listRevisions(fileId).catch(() => []);
    for (const revision of history.filter((r) => r.id !== head).reverse()) {
      let data: T;
      try {
        data = parse(await readJson(fileId, revision.id));
      } catch {
        continue;
      }
      try {
        if (!kept) throw new Error("not allowed");
        const written = await updateFileContent(fileId, jsonBlob(data));
        const when = revision.modifiedTime ? new Date(revision.modifiedTime).toLocaleDateString() : "earlier";
        this.notices.push(`${name} in your Drive was damaged. Its last good version (from ${when}) has been put back, and the damaged copy is kept in the backups folder.`);
        return { fileId, revision: written, data };
      } catch {
        // Family who can only view: read the good version, but leave the file for the owner to repair.
        return { fileId, revision: head, data };
      }
    }
    // No good version left: keep the damaged contents inside the file, untouched, and carry on.
    this.notices.push(`${name} in your Drive couldn't be read. Its contents are kept as they are; you can restore from a backup in Settings.`);
    const data = parse({ unreadable: damagedText ? [{ damagedFileText: damagedText }] : [] });
    return { fileId, revision: head, data };
  }

  private async backupsFolder(location: Location): Promise<string> {
    if (!location.backupsFolderId) {
      const existing = (await listFolderFiles(location.folderId)).find((f) => f.appProperties?.[KEY] === "backups");
      location.backupsFolderId = existing?.id ?? (await createFolder("backups", location.folderId, { [KEY]: "backups" })).id;
    }
    return location.backupsFolderId;
  }

  /**
   * Book owner: once a week, keep a copy of the whole book's text (not the photos,
   * which stay in photos/) in backups/, keeping the last few.
   */
  async ensureBackup(journal: Journal): Promise<boolean> {
    const location = await this.requireLocation();
    const folder = await this.backupsFolder(location);
    const snapshots = (await listFolderFiles(folder)).filter((f) => f.appProperties?.[KEY] === "snapshot");
    const newest = snapshots.at(-1)?.createdTime;
    if (newest && Date.now() - new Date(newest).getTime() < BACKUP_EVERY_DAYS * 86_400_000) return false;
    await createFile(`book-backup-${today()}.json`, folder, jsonBlob({ ...journal, backedUpAt: new Date().toISOString() }), { [KEY]: "snapshot" });
    for (const old of snapshots.slice(0, Math.max(0, snapshots.length + 1 - BACKUPS_KEPT))) await trashFile(old.id).catch(() => undefined);
    return true;
  }

  async listBackups(): Promise<{ id: string; date: string }[]> {
    const location = await this.requireLocation();
    const folder = await this.backupsFolder(location);
    return (await listFolderFiles(folder))
      .filter((f) => f.appProperties?.[KEY] === "snapshot" || f.appProperties?.[KEY] === "backup")
      .map((f) => ({ id: f.id, date: f.createdTime ?? "" }))
      .reverse();
  }

  /** Brings back every memory in a backup that isn't in the book now. Never removes or overwrites anything. */
  async restoreFromBackup(backupId: string): Promise<{ journal: Journal; restored: number }> {
    const backup = normaliseJournal(await readJson(backupId));
    let restored = 0;
    const journal = await this.update((current) => {
      const have = new Set(current.memories.map((m) => m.id));
      const missing = backup.memories.filter((m) => !have.has(m.id));
      restored = missing.length;
      return missing.length ? { ...current, memories: [...current.memories, ...missing] } : current;
    });
    return { journal, restored };
  }

  /**
   * Photos added by family belong to them: they use their Drive space, and would
   * vanish from the book if they deleted them or their account. So the owner's app
   * makes its own copy of each one the book uses, and points the book at it.
   */
  async adoptFamilyPhotos(): Promise<{ adopted: number; journal?: Journal }> {
    const location = await this.requireLocation();
    const theirs = await listFilesOwnedByOthers(location.photosFolderId);
    if (theirs.length === 0) return { adopted: 0 };
    const current = await this.load();
    if (!current) return { adopted: 0 };
    const used = new Set<string>();
    for (const p of current.memories.flatMap((m) => m.photos)) {
      used.add(p.fileId);
      if (p.thumbId) used.add(p.thumbId);
    }
    if (current.settings.coverPhoto) used.add(current.settings.coverPhoto.fileId);

    // Only photos the book uses (copies already made are no longer used, so nothing is copied twice).
    const copies = new Map<string, string>();
    for (const file of theirs.filter((f) => used.has(f.id) && f.appProperties?.[KEY] === "photo")) {
      copies.set(file.id, (await copyFile(file.id, file.name, location.photosFolderId, { [KEY]: "photo" })).id);
    }
    for (const file of theirs.filter((f) => used.has(f.id) && f.appProperties?.[KEY] === "small")) {
      const photo = file.appProperties?.[PHOTO_KEY];
      copies.set(file.id, (await copyFile(file.id, file.name, location.photosFolderId, { [KEY]: "small", [PHOTO_KEY]: copies.get(photo ?? "") ?? photo ?? "" })).id);
    }
    if (copies.size === 0) return { adopted: 0 };

    const swap = (p: PhotoRef): PhotoRef => ({ ...p, fileId: copies.get(p.fileId) ?? p.fileId, thumbId: p.thumbId && (copies.get(p.thumbId) ?? p.thumbId) });
    const journal = await this.update((latest) => ({
      ...latest,
      memories: latest.memories.map((m) => (m.photos.some((p) => copies.has(p.fileId)) ? { ...m, photos: m.photos.map(swap) } : m)),
      settings: latest.settings.coverPhoto ? { ...latest.settings, coverPhoto: swap(latest.settings.coverPhoto) } : latest.settings,
    }));
    // Tidy the originals out of the book's folder (they stay in their owner's Drive).
    await Promise.all([...copies.keys()].map((id) => removeFromFolder(id, location.photosFolderId).catch(() => undefined)));
    return { adopted: [...copies.keys()].filter((id) => theirs.find((f) => f.id === id)?.appProperties?.[KEY] === "photo").length, journal };
  }

  /** An older book that hasn't been converted (e.g. opened by family who can only view it). */
  private async readSingle(location: Location): Promise<Journal> {
    return normaliseJournal(await readJson(location.journalFileId));
  }

  /** Saving to an older single-file book: same safety as above, for the one file. */
  private async updateSingle(location: Location, change: (journal: Journal) => Journal): Promise<Journal> {
    const id = location.journalFileId;
    const revision = await headRevision(id).catch(() => undefined);
    const raw = (await readJson(id, revision)) as { memories?: unknown[] };
    // Entries that can't be read are written back exactly as they were.
    const unreadable = (Array.isArray(raw?.memories) ? raw.memories : []).filter((m) => !normaliseMemory(m));
    let base = revision;
    let next = change(normaliseJournal(raw));
    for (let attempt = 0; attempt < 5; attempt++) {
      const result = await writeChecked(id, base, { ...next, unreadable: undefined, memories: [...next.memories, ...unreadable] });
      if (!result.theirs) break;
      next = change(normaliseJournal(await readJson(id, result.theirs)));
      base = result.written;
    }
    return next;
  }

  /** Brings in anything an old app tab wrote to journal.json after the book was converted. */
  private async catchUpLegacy(location: Location, journal: Journal, merged?: string): Promise<Journal> {
    try {
      const revision = await headRevision(location.legacyFileId!);
      if (!revision || revision === merged) return journal;
      const legacy = normaliseJournal(await readJson(location.legacyFileId!, revision));
      const saved = mergeLegacy(journal, legacy) === journal ? journal : await this.update((current) => mergeLegacy(current, legacy));
      // Remember which version was merged, so it's only read again if it changes.
      const id = location.journalFileId;
      let base = await headRevision(id).catch(() => undefined);
      let index = parseIndex(await readJson(id, base));
      for (let attempt = 0; attempt < 3; attempt++) {
        const result = await writeChecked(id, base, { ...index, legacyRevision: revision });
        if (!result.theirs) break;
        index = parseIndex(await readJson(id, result.theirs));
        base = result.written;
      }
      return saved;
    } catch {
      return journal; // reading the old file is a bonus, never a reason to fail
    }
  }

  /**
   * Converts an older book (one journal.json) to the split format, once, by its owner.
   * journal.json is first copied into backups/, and is itself left exactly as it was.
   */
  private async convert(folderId: string, legacyId: string, children: DriveChild[]): Promise<string> {
    let backups = children.find((f) => f.appProperties?.[KEY] === "backups");
    backups ??= await createFolder("backups", folderId, { [KEY]: "backups" });
    const day = new Date().toISOString().slice(0, 10);
    await copyFile(legacyId, `journal-before-update-${day}.json`, backups.id, { [KEY]: "backup" });

    const revision = await headRevision(legacyId).catch(() => undefined);
    const raw = (await readJson(legacyId, revision)) as { memories?: unknown[] };
    const journal = normaliseJournal(raw);
    const { index, years } = split(journal, revision);
    const unreadable = (Array.isArray(raw?.memories) ? raw.memories : []).filter((m) => !normaliseMemory(m));
    // Damaged entries go, untouched, into the "undated" file.
    if (unreadable.length && !years.has("undated")) years.set("undated", []);
    for (const [year, memories] of years) {
      const content: YearContent = { version: FORMAT, year, memories, unreadable: year === "undated" && unreadable.length ? unreadable : undefined };
      await createFile(yearFileName(year), folderId, jsonBlob(content), { [KEY]: "year", [YEAR_KEY]: year });
    }
    // book.json last: until it exists, the book still opens the old way.
    const file = await createFile("book.json", folderId, jsonBlob(index), { [KEY]: "index" });
    return file.id;
  }

  private async saveDetailsCopy(location: Location, index: IndexContent) {
    const folder = await this.backupsFolder(location);
    const existing = (await listFolderFiles(folder)).find((f) => f.appProperties?.[KEY] === "details");
    if (existing) await updateFileContent(existing.id, jsonBlob(index));
    else await createFile("book-details.json", folder, jsonBlob(index), { [KEY]: "details" });
  }

  /**
   * book.json is gone and isn't in the bin: make a new one from the latest backup
   * (or, failing that, from the folder's name), keeping every memory file there is.
   */
  private async rebuildIndex(folder: { id: string; name: string; appProperties?: Record<string, string> }, children: DriveChild[]): Promise<DriveChild> {
    const backups = children.find((f) => f.appProperties?.[KEY] === "backups");
    const snapshots = backups ? (await listFolderFiles(backups.id)).filter((f) => f.appProperties?.[KEY] === "snapshot") : [];
    const latest = snapshots.at(-1);
    const backup = latest ? normaliseJournal(await readJson(latest.id).catch(() => ({}))) : null;
    // The spare copy of the book's details is newer than the weekly backup, so prefer it.
    const detailsFile = backups ? (await listFolderFiles(backups.id)).find((f) => f.appProperties?.[KEY] === "details") : undefined;
    const details = detailsFile ? parseIndex(await readJson(detailsFile.id).catch(() => ({}))) : null;
    const hasYears = children.some((f) => f.appProperties?.[KEY] === "year");

    // The folder always carries the child's current name.
    const childName = folderChild(folder);
    const known = details?.settings ?? backup?.settings;
    const settings = known ? { ...known, childName } : { ...normaliseJournal({}).settings, childName, bookTitle: "Memory Book" };
    const growth = details?.growth ?? backup?.growth;
    const journal: Journal = { version: 1, settings, growth, memories: hasYears ? [] : (backup?.memories ?? []) };
    const { index, years } = split(journal);
    for (const [year, memories] of years) {
      await createFile(yearFileName(year), folder.id, jsonBlob({ version: FORMAT, year, memories }), { [KEY]: "year", [YEAR_KEY]: year });
    }
    const file = await createFile("book.json", folder.id, jsonBlob(index), { [KEY]: "index" });
    if (backup) this.notices.push(`The book's main file (book.json) was missing, so it was rebuilt from the backup of ${latest?.createdTime?.slice(0, 10)}.`);
    else if (hasYears || children.some((f) => f.appProperties?.[KEY] === "photos"))
      this.notices.push("The book's main file (book.json) was missing, so it was rebuilt. Please check your child's details in Settings.");
    return { id: file.id, name: "book.json" };
  }

  private async requireLocation(): Promise<Location> {
    const location = this.location ?? (await this.locate());
    if (!location) throw new Error("No memory book found in Google Drive.");
    return location;
  }

  private async locate(): Promise<Location | null> {
    if (this.location) return this.location;

    // The book chosen in the switcher; otherwise your own first book; otherwise one shared with you by family.
    const owned = await findFiles(`${appPropertyQuery(KEY, "root")} and 'me' in owners`);
    const sharedBooks = owned.length && !this.preferredBook ? [] : await findFiles(`${appPropertyQuery(KEY, "root")} and sharedWithMe`).catch(() => []);
    const chosen = this.preferredBook ? [...owned, ...sharedBooks].find((f) => f.id === this.preferredBook) : undefined;
    const folder = chosen ?? owned[0] ?? sharedBooks[0];
    if (!folder) return null;
    const own = owned.some((f) => f.id === folder.id) ? folder : undefined;

    const children = await listFolderFiles(folder.id);
    let photos = children.find((f) => f.appProperties?.[KEY] === "photos");
    let index = children.find((f) => f.appProperties?.[KEY] === "index");
    const legacy = children.find((f) => f.appProperties?.[KEY] === "journal");

    // Repair a half-created book (e.g. the connection dropped during setup).
    if (!photos && own) photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    if (!photos) return null;

    // The book's main file is missing (deleted by mistake?): rescue it rather than start a new book.
    let legacyFile = legacy;
    if (!index && !legacy && own) {
      const binned = await listTrashedInFolder(folder.id).catch((): DriveChild[] => []);
      const rescued = binned.find((f) => f.appProperties?.[KEY] === "index") ?? binned.find((f) => f.appProperties?.[KEY] === "journal");
      if (rescued) {
        await updateMetadata(rescued.id, { trashed: false });
        this.notices.push(`${rescued.name} had been moved to the Drive bin. It has been put back.`);
        if (rescued.appProperties?.[KEY] === "index") index = rescued;
        else legacyFile = rescued;
      } else {
        index = await this.rebuildIndex(folder, children);
      }
    }

    // An older single-file book: its owner converts it once; anyone else keeps reading it as it is.
    if (!index && legacyFile && own) index = { id: await this.convert(folder.id, legacyFile.id, children), name: "book.json" };
    if (!index && !legacyFile) return null;

    this.location = {
      folderId: folder.id,
      photosFolderId: photos.id,
      journalFileId: index?.id ?? legacyFile!.id,
      format: index ? "split" : "single",
      legacyFileId: index ? legacyFile?.id : undefined,
      backupsFolderId: children.find((f) => f.appProperties?.[KEY] === "backups")?.id,
      sharingLocked: folder.appProperties?.[SHARING_LOCKED] === "1",
      titled: folder.appProperties?.[TITLED_KEY] === "1",
      needsLabels: !!own && !folder.appProperties?.[TITLE_KEY],
    };
    return this.location;
  }
}
