import type { BookSettings, Journal } from "../types";
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
  inFolderQuery,
  isPublicPermission,
  listFolderFiles,
  listOwnedFiles,
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
}

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

export const folderName = (childName: string) => `Memory Book – ${childName.trim() || "my child"}`;

const jsonBlob = (value: unknown) => new Blob([toJson(value)], { type: "application/json" });

async function readJson(fileId: string, revision?: string): Promise<unknown> {
  const blob = revision ? await downloadRevision(fileId, revision) : await downloadFile(fileId);
  return JSON.parse(await blob.text());
}

/**
 * Writes a file, then checks Drive's version history: if someone else's save
 * landed between our read (`base`) and our write, returns their version so the
 * change can be re-applied on top of it. Both changes end up kept.
 */
async function writeChecked(fileId: string, base: string | undefined, content: unknown): Promise<{ written?: string; theirs?: string }> {
  const written = await updateFileContent(fileId, jsonBlob(content));
  if (!base || !written) return { written };
  const history = await listRevisionIds(fileId).catch(() => null);
  const at = history?.indexOf(written) ?? -1;
  if (!history || at <= 0 || history[at - 1] === base) return { written };
  return { written, theirs: history[at - 1] };
}

export class DriveRepository implements JournalRepository {
  private location: Location | null = null;

  async load(): Promise<Journal | null> {
    const location = await this.locate();
    if (!location) return null;
    if (location.format === "single") return this.readSingle(location);
    const state = await this.readState(location);
    let journal = assemble(state.index.data, [...state.years.values()].map((p) => p.data));
    if (location.legacyFileId) journal = await this.catchUpLegacy(location, journal, state.index.data.legacyRevision);
    return journal;
  }

  async create(settings: BookSettings): Promise<Journal> {
    // If a book already exists (e.g. set up on another device), use it.
    const existing = await this.load();
    if (existing) return existing;

    const folder = await createFolder(folderName(settings.childName), null, { [KEY]: "root" });
    const photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    const journal = emptyJournal(settings);
    const index = await createFile("book.json", folder.id, jsonBlob(split(journal).index), { [KEY]: "index" });
    this.location = { folderId: folder.id, photosFolderId: photos.id, journalFileId: index.id, format: "split" };
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
        } else state.index = { ...state.index, revision: result.written, data: plan.index };
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

    if (next.settings.childName !== before.settings.childName) {
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

  folderUrl(): string | null {
    return this.location ? `https://drive.google.com/drive/folders/${this.location.folderId}` : null;
  }

  /* -------------------------------------------------------------- */

  /** Every file of a split book, each with the exact version read. */
  private async readState(location: Location): Promise<BookState> {
    const files = await listFolderFiles(location.folderId);
    const read = async <T,>(fileId: string, parse: (raw: unknown) => T): Promise<Part<T>> => {
      const revision = await headRevision(fileId).catch(() => undefined);
      return { fileId, revision, data: parse(await readJson(fileId, revision)) };
    };
    const index = await read(location.journalFileId, parseIndex);
    const years = new Map<string, Part<YearContent>>();
    for (const file of files.filter((f) => f.appProperties?.[KEY] === "year")) {
      const year = file.appProperties?.[YEAR_KEY] ?? file.name.replace(/^memories-|\.json$/g, "");
      const part = await read(file.id, (raw) => parseYear(raw, year));
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

    const children = await listFolderFiles(folder.id);
    let photos = children.find((f) => f.appProperties?.[KEY] === "photos");
    let index = children.find((f) => f.appProperties?.[KEY] === "index");
    const legacy = children.find((f) => f.appProperties?.[KEY] === "journal");

    // Repair a half-created book (e.g. the connection dropped during setup).
    if (!photos && own) photos = await createFolder("photos", folder.id, { [KEY]: "photos" });
    if (!photos) return null;

    // An older single-file book: its owner converts it once; anyone else keeps reading it as it is.
    if (!index && legacy && own) index = { id: await this.convert(folder.id, legacy.id, children), name: "book.json" };
    if (!index && !legacy) return null;

    this.location = {
      folderId: folder.id,
      photosFolderId: photos.id,
      journalFileId: index?.id ?? legacy!.id,
      format: index ? "split" : "single",
      legacyFileId: index ? legacy?.id : undefined,
      sharingLocked: folder.appProperties?.[SHARING_LOCKED] === "1",
    };
    return this.location;
  }
}
