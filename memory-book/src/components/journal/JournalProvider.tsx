"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BookSettings, GrowthEntry, Journal, Memory, PhotoRef, Tag } from "@/lib/types";
import type { BookAccess, BookSummary, FamilyMember, FamilyRole, JournalRepository } from "@/lib/repository";
import { DriveRepository } from "@/lib/drive/drive-repository";
import { DriveError, OfflineError, SignedOutError, getAccessToken, getImageInfo, isStorageFull } from "@/lib/drive/client";
import { pickFromDrive, type PickedFile } from "@/lib/drive/picker";
import { fromDrive, importPhotos, type IncomingPhoto } from "@/lib/folder-import";
import { idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/idb";
import { createCachedPhotoResolver } from "@/lib/photo-cache";
import { uploadBookPhoto } from "@/lib/upload";
import { clearDeviceData } from "@/lib/device-data";
import { PhotoSourceProvider, type PhotoResolver } from "@/components/book/PhotoSource";
import { handwritingStyle } from "@/lib/book-style";
import { photoHash, samePhoto } from "@/lib/photo-hash";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DraftPhoto =
  | { kind: "existing"; ref: PhotoRef }
  | { kind: "new"; blob: Blob; width: number; height: number; hash?: string; uploadedId?: string; uploadedThumbId?: string };

export interface MemoryInput {
  id?: string;
  date: string;
  title?: string;
  text: string;
  tags: Tag[];
  photos: DraftPhoto[];
  kind?: "letter";
  sealedUntil?: string;
}

/** A memory saved on this device, waiting to be uploaded to Drive. */
interface PendingSave {
  draftId: string;
  /** Whose memory this is: it only ever uploads into that account's book. */
  owner?: string;
  memoryId: string;
  input: Omit<MemoryInput, "id">;
  /** Photos that were in the memory before this edit. */
  previousPhotoIds: string[];
  savedAt: string;
}

type Status = "loading" | "setup" | "ready" | "error" | "signed-out";

interface JournalContextValue {
  status: Status;
  error: string | null;
  /** A one-off note for the book's owner (e.g. a public link was removed). */
  notice: string | null;
  dismissNotice(): void;
  /** The book as saved in Drive, plus anything still waiting to upload. */
  journal: Journal | null;
  pendingCount: number;
  syncing: boolean;
  folderUrl: string | null;
  /** Creates the book in Drive (`another`: an extra book, e.g. for a second child). */
  setupBook(settings: BookSettings, options?: { another?: boolean }): Promise<void>;
  /** Saves locally first, then uploads. Resolves with "saved" or "queued" (kept on this device). */
  saveMemory(input: MemoryInput, onProgress?: (message: string) => void): Promise<"saved" | "queued">;
  deleteMemory(id: string): Promise<void>;
  updateSettings(settings: BookSettings, newCover?: { blob: Blob; width: number; height: number }): Promise<void>;
  syncNow(): Promise<void>;
  reload(): Promise<void>;
  driveImport: DriveImportState;
  /** Opens Google's picker (in the folder used last, or anywhere); the photos you tick become memories waiting for words. */
  addFromDrive(where?: "last-folder" | "anywhere"): Promise<void>;
  /** Whose book this is; family who can only view get `canEdit: false`. */
  access: BookAccess;
  listFamily(): Promise<FamilyMember[]>;
  inviteFamily(email: string, role: FamilyRole): Promise<void>;
  removeFamily(memberId: string): Promise<void>;
  /** Height/weight for a month of age (shown on that month's divider page). */
  updateGrowth(months: number, entry: GrowthEntry): Promise<void>;
  /** Finds the same photo saved more than once and keeps only the first. */
  removeDuplicatePhotos(onProgress?: (done: number, total: number) => void): Promise<{ photos: number; pages: number }>;
  /** For family: allow the app to open a book someone shared with you. */
  /** Family: open a book someone shared with you. */
  openSharedBook(): Promise<void>;
  /** Every book this account can open (one per child, plus shared ones). */
  books: BookSummary[];
  currentBookId: string | null;
  switchBook(bookId: string): Promise<void>;
  listBackups(): Promise<{ id: string; date: string }[]>;
  /** Owner only: moves the book folder to the Drive bin. */
  trashBook(): Promise<void>;
  /** Brings back memories from a backup that aren't in the book now; returns how many. */
  restoreFromBackup(backupId: string): Promise<number>;
}

export interface DriveImportState {
  importing: boolean;
  /** Photos were picked from a Drive folder on this device before ("Check for new photos" opens it). */
  hasFolder?: boolean;
  progress?: { done: number; total: number };
  lastAdded?: number;
  message?: string;
}

/** The Drive folder you last picked photos from, to open the picker there next time (this device only). */
const LAST_FOLDER_KEY = "memory-book:last-photo-folder";
/** Where the service worker leaves photos shared into the app (see public/sw.js). */
const SHARE_INBOX = "share-inbox";

const JournalContext = createContext<JournalContextValue | null>(null);

/** Like useJournal, but returns null outside a signed-in book (e.g. the demo). */
export function useOptionalJournal(): JournalContextValue | null {
  return useContext(JournalContext);
}

export function useJournal(): JournalContextValue {
  const value = useContext(JournalContext);
  if (!value) throw new Error("useJournal must be used inside <JournalProvider>");
  return value;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/** Plain words for what went wrong — never Google's technical messages. */
export function friendlyError(error: unknown): string {
  if (isStorageFull(error))
    return "Your Google Drive is full. Your memory is kept safely on this device and will upload by itself once there's space — free some up in Google Drive, or get more at one.google.com.";
  if (error instanceof SignedOutError || error instanceof OfflineError) return error.message;
  if (error instanceof DriveError) {
    if (error.status === 404) return "Something in this book can't be found in Google Drive any more — it may have been deleted or unshared.";
    if (error.status === 403) return "Google Drive didn't allow this. If it's someone else's book, you may only be able to view it.";
    if (error.status === 429 || error.status >= 500)
      return "Google Drive is busy right now. Your memory is kept on this device and will upload by itself in a moment.";
    return "Google Drive couldn't do that just now. Please try again.";
  }
  // Our own messages are plain Errors written for people; anything else (a bug) gets a calm, general message.
  if (error instanceof Error && error.name === "Error" && error.message) return error.message;
  return "Something went wrong. Your memories are safe — please try again.";
}

function upsertMemory(journal: Journal, memory: Memory): Journal {
  const existing = journal.memories.find((m) => m.id === memory.id);
  const merged = existing ? { ...memory, createdAt: existing.createdAt } : memory;
  return {
    ...journal,
    memories: existing
      ? journal.memories.map((m) => (m.id === memory.id ? merged : m))
      : [...journal.memories, merged],
  };
}

/** Photo IDs still referenced by the book (so we never bin a photo that's in use, e.g. as the cover). */
function photoIdsInUse(journal: Journal): Set<string> {
  const ids = new Set(journal.memories.flatMap((m) => m.photos.map((p) => p.fileId)));
  if (journal.settings.coverPhoto) ids.add(journal.settings.coverPhoto.fileId);
  return ids;
}

const cacheKey = (owner: string, book: string | null) => `memory-book:journal:${owner}:${book ?? "first"}`;
/** Which child's book is open on this device (for families with more than one). */
const bookKey = (owner: string) => `memory-book:book:${owner}`;
const storedBook = (owner: string) => {
  try {
    return localStorage.getItem(bookKey(owner));
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */

export function JournalProvider({
  owner,
  repository: providedRepository,
  children,
}: {
  /** The signed-in account, used to keep each person's offline copy separate. */
  owner: string;
  repository?: JournalRepository;
  children: React.ReactNode;
}) {
  const repository = useMemo(() => {
    const repo = providedRepository ?? new DriveRepository();
    if (typeof window !== "undefined") repo.selectBook(storedBook(owner));
    return repo;
  }, [providedRepository, owner]);
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [pending, setPending] = useState<PendingSave[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  const commit = useCallback(
    (next: Journal) => {
      setJournal(next);
      try {
        localStorage.setItem(cacheKey(owner, repository.currentBookId()), JSON.stringify(next));
      } catch {
        // storage full or blocked — the offline copy is only a convenience
      }
    },
    [owner, repository],
  );

  const handleError = useCallback((e: unknown) => {
    if (e instanceof SignedOutError) {
      setStatus("signed-out");
      // Signed out (e.g. the sign-in expired): don't leave the book readable on this device.
      void clearDeviceData();
    }
    setError(friendlyError(e));
  }, []);

  /* ---------------- loading ---------------- */

  const [access, setAccess] = useState<BookAccess>({ isOwner: true, canEdit: true });

  const reload = useCallback(async () => {
    setError(null);
    try {
      const loaded = await repository.load();
      setFolderUrl(repository.folderUrl());
      const repaired = repository.takeNotices();
      if (repaired.length) setNotice(repaired.join(" "));
      if (loaded) {
        commit(loaded);
        setStatus("ready");
        repository.listBooks().then(setBooks).catch(() => undefined);
        repository
          .access()
          .then(async (found) => {
            setAccess({ ...found, known: true });
            // The owner's app keeps the book private every time it opens.
            if (!found.isOwner) return;
            // A weekly safety copy of the book's text, in your Drive's backups folder.
            await repository.ensureBackup(loaded).catch(() => undefined);
            // Photos family added belong to them: keep your own copies, so they can't disappear from the book.
            const adopted = await repository.adoptFamilyPhotos().catch(() => null);
            if (adopted?.journal) commit(adopted.journal);
            const { removedPublicShares } = await repository.secureSharing();
            if (removedPublicShares > 0)
              setNotice(
                "Someone had shared part of this book with a public link. That link has been switched off — only the family you invited can see it.",
              );
          })
          .catch(() => undefined);
      } else {
        setStatus("setup");
      }
    } catch (e) {
      // Offline (or Drive hiccup) but we have a copy from last time: keep reading.
      setStatus((current) => (current === "ready" ? "ready" : e instanceof SignedOutError ? "signed-out" : "error"));
      handleError(e);
    }
  }, [repository, commit, handleError]);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(cacheKey(owner, storedBook(owner)));
      if (cached) {
        setJournal(JSON.parse(cached) as Journal);
        setStatus("ready");
      }
    } catch {
      // ignore a damaged offline copy
    }
    idbGetAll<PendingSave>("drafts")
      .then((drafts) => setPending(drafts.filter((d) => !d.owner || d.owner === owner).sort((a, b) => a.savedAt.localeCompare(b.savedAt))))
      .catch(() => undefined);
    void reload();
  }, [owner, reload]);

  /* ---------------- uploading pending saves ---------------- */

  // Uploads run one at a time, in order, through this chain.
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const enqueue = useCallback(<T,>(task: () => Promise<T>): Promise<T> => {
    const run = queue.current.then(task, task);
    queue.current = run.catch(() => undefined);
    return run;
  }, []);

  /** Uploads one saved draft. Re-reads it first, so photos already uploaded by an earlier try are skipped. */
  const uploadOne = useCallback(
    async (draftId: string, onProgress?: (message: string) => void) => {
      const draft = await idbGet<PendingSave>("drafts", draftId);
      if (!draft) return; // already uploaded

      const toUpload = draft.input.photos.filter((p) => p.kind === "new" && !p.uploadedId).length;
      let done = 0;
      for (const [i, photo] of draft.input.photos.entries()) {
        if (photo.kind !== "new" || photo.uploadedId) continue;
        onProgress?.(`Uploading photo ${++done} of ${toUpload}…`);
        const uploaded = await uploadBookPhoto(repository, photo.blob, `${draft.input.date}-${draft.memoryId.slice(0, 8)}-${i + 1}.jpg`);
        photo.uploadedId = uploaded.fileId;
        photo.uploadedThumbId = uploaded.thumbId;
        await idbPut("drafts", draft.draftId, draft);
      }

      onProgress?.("Writing it into the book…");
      const photos: PhotoRef[] = draft.input.photos.map((p) =>
        p.kind === "existing"
          ? p.ref
          : { fileId: p.uploadedId!, width: p.width, height: p.height, hash: p.hash, thumbId: p.uploadedThumbId },
      );
      const memory: Memory = {
        id: draft.memoryId,
        date: draft.input.date,
        title: draft.input.title?.trim() || undefined,
        text: draft.input.text,
        tags: draft.input.tags,
        photos,
        kind: draft.input.kind,
        sealedUntil: draft.input.sealedUntil || undefined,
        createdAt: draft.savedAt,
        updatedAt: new Date().toISOString(),
      };
      const saved = await repository.update((latest) => upsertMemory(latest, memory));
      commit(saved);
      await idbDelete("drafts", draft.draftId);
      setPending((list) => list.filter((d) => d.draftId !== draft.draftId));

      const inUse = photoIdsInUse(saved);
      await Promise.all(
        draft.previousPhotoIds
          .filter((id) => !inUse.has(id))
          .map((id) => repository.removePhoto(id).catch(() => undefined)),
      );
    },
    [repository, commit],
  );

  const syncNow = useCallback(
    () =>
      enqueue(async () => {
        setSyncing(true);
        try {
          const drafts = (await idbGetAll<PendingSave>("drafts")).filter((d) => !d.owner || d.owner === owner);
          for (const draft of drafts.sort((a, b) => a.savedAt.localeCompare(b.savedAt))) {
            await uploadOne(draft.draftId);
          }
          setError(null);
        } catch (e) {
          handleError(e);
        } finally {
          setSyncing(false);
        }
      }),
    [enqueue, uploadOne, handleError],
  );

  // Upload anything left over from last time, and again whenever the connection comes back.
  const hasPending = pending.length > 0;
  useEffect(() => {
    if (status !== "ready" || !hasPending) return;
    const onOnline = () => void syncNow();
    window.addEventListener("online", onOnline);
    const retry = window.setInterval(() => navigator.onLine && void syncNow(), 60_000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(retry);
    };
  }, [status, hasPending, syncNow]);

  const startedSync = useRef(false);
  useEffect(() => {
    if (status === "ready" && !startedSync.current) {
      startedSync.current = true;
      void syncNow();
    }
  }, [status, syncNow]);

  /* ---------------- actions ---------------- */

  const rememberBook = useCallback(
    (bookId: string | null) => {
      try {
        if (bookId) localStorage.setItem(bookKey(owner), bookId);
        else localStorage.removeItem(bookKey(owner));
      } catch {
        // this device just won't remember the choice
      }
    },
    [owner],
  );

  const setupBook = useCallback(
    async (settings: BookSettings, options?: { another?: boolean }) => {
      const created = await repository.create(settings, options);
      rememberBook(repository.currentBookId());
      setFolderUrl(repository.folderUrl());
      commit(created);
      setStatus("ready");
      setError(null);
      repository.listBooks().then(setBooks).catch(() => undefined);
    },
    [repository, commit, rememberBook],
  );

  /** Opens another child's book (or one shared with you). */
  const switchBook = useCallback(
    async (bookId: string) => {
      rememberBook(bookId);
      repository.selectBook(bookId);
      setJournal(null);
      setAccess({ isOwner: true, canEdit: true });
      setStatus("loading");
      await reload();
    },
    [repository, rememberBook, reload],
  );

  const saveMemory = useCallback(
    async (input: MemoryInput, onProgress?: (message: string) => void): Promise<"saved" | "queued"> => {
      const memoryId = input.id ?? newId();
      const previous = journal?.memories.find((m) => m.id === memoryId);
      const draft: PendingSave = {
        draftId: newId(),
        owner,
        memoryId,
        input: {
          date: input.date,
          title: input.title,
          text: input.text,
          tags: input.tags,
          photos: input.photos,
          kind: input.kind,
          sealedUntil: input.sealedUntil,
        },
        previousPhotoIds: previous?.photos.map((p) => p.fileId) ?? [],
        savedAt: previous?.createdAt ?? new Date().toISOString(),
      };
      onProgress?.("Saving on this device…");
      await idbPut("drafts", draft.draftId, draft);
      setPending((list) => [...list, draft]);

      setSyncing(true);
      try {
        await enqueue(() => uploadOne(draft.draftId, onProgress));
        setError(null);
        return "saved";
      } catch (e) {
        if (e instanceof OfflineError || (typeof navigator !== "undefined" && !navigator.onLine)) return "queued";
        // Drive full, or Google busy: the memory stays safe on this device and uploads by itself later.
        if (isStorageFull(e) || (e instanceof DriveError && (e.status === 429 || e.status >= 500))) {
          handleError(e);
          return "queued";
        }
        handleError(e);
        throw e;
      } finally {
        setSyncing(false);
      }
    },
    [journal, enqueue, uploadOne, handleError],
  );

  const deleteMemory = useCallback(
    async (id: string) => {
      const memory = journal?.memories.find((m) => m.id === id);
      const saved = await repository.update((latest) => ({
        ...latest,
        memories: latest.memories.filter((m) => m.id !== id),
      }));
      commit(saved);
      // Also drop any not-yet-uploaded edit of this memory.
      for (const draft of pending.filter((d) => d.memoryId === id)) await idbDelete("drafts", draft.draftId);
      setPending((list) => list.filter((d) => d.memoryId !== id));

      const inUse = photoIdsInUse(saved);
      await Promise.all(
        (memory?.photos ?? [])
          .filter((p) => !inUse.has(p.fileId))
          .map((p) => repository.removePhoto(p.fileId).catch(() => undefined)),
      );
    },
    [journal, pending, repository, commit],
  );

  const updateSettings = useCallback(
    async (settings: BookSettings, newCover?: { blob: Blob; width: number; height: number }) => {
      let next = settings;
      if (newCover) {
        const { fileId, thumbId } = await uploadBookPhoto(repository, newCover.blob, `cover-${Date.now()}.jpg`);
        next = { ...settings, coverPhoto: { fileId, width: newCover.width, height: newCover.height, thumbId } };
      }
      const oldCover = journal?.settings.coverPhoto?.fileId;
      const saved = await repository.update((latest) => ({ ...latest, settings: next }));
      commit(saved);
      if (oldCover && !photoIdsInUse(saved).has(oldCover)) await repository.removePhoto(oldCover).catch(() => undefined);
    },
    [journal, repository, commit],
  );

  /* ---------------- photos from Google Drive ---------------- */

  const [importState, setImportState] = useState<DriveImportState>({ importing: false });

  /** Copies photos into the book as memories waiting for words, a small batch at a time. */
  const runImport = useCallback(
    (getPhotos: () => Promise<IncomingPhoto[]>, total: number) =>
      enqueue(async () => {
        setImportState((s) => ({ ...s, importing: true, progress: { done: 0, total }, message: undefined }));
        try {
          let rest = await getPhotos();
          let latest = journalRef.current!;
          let added = 0;
          let skipped = 0;
          let alreadyInBook = 0;
          let done = 0;
          while (rest.length) {
            const outcome = await importPhotos(repository, latest, rest, (n) =>
              setImportState((s) => ({ ...s, progress: { done: done + n, total } })),
            );
            done += rest.length - outcome.rest.length;
            commit(outcome.journal);
            latest = outcome.journal;
            added += outcome.added;
            skipped += outcome.skipped;
            alreadyInBook += outcome.alreadyInBook;
            rest = outcome.rest;
          }
          const notes = [
            alreadyInBook ? `${alreadyInBook} ${alreadyInBook === 1 ? "was" : "were"} already in the book` : "",
            skipped ? `${skipped} couldn't be opened (iPhone HEIC photos need "Most Compatible" in Camera settings)` : "",
          ].filter(Boolean);
          setImportState((s) => ({
            ...s,
            importing: false,
            lastAdded: added,
            message: notes.length ? `${notes.join("; ")}.` : undefined,
          }));
        } catch (e) {
          setImportState((s) => ({
            ...s,
            importing: false,
            message:
              e instanceof OfflineError
                ? "You're offline — try again when you're back online."
                : e instanceof Error
                  ? e.message
                  : "Couldn't bring in the photos.",
          }));
        }
      }),
    [enqueue, repository, commit],
  );

  // Remember (on this device) the folder you pick photos from, so "Check for new photos" opens there.
  useEffect(() => {
    try {
      const folder = localStorage.getItem(LAST_FOLDER_KEY);
      if (folder) setImportState((s) => ({ ...s, hasFolder: true }));
    } catch {
      // no saved folder
    }
  }, []);

  const addFromDrive = useCallback(
    async (where: "last-folder" | "anywhere" = "last-folder") => {
      setImportState((s) => ({ ...s, message: undefined, lastAdded: undefined }));
      let picked: PickedFile[];
      try {
        let folderId: string | undefined;
        try {
          if (where === "last-folder") folderId = localStorage.getItem(LAST_FOLDER_KEY) ?? undefined;
        } catch {
          // no saved folder
        }
        picked = (
          await pickFromDrive(await getAccessToken(), {
            kind: "photos",
            folderId,
            title: folderId ? "Tick the new photos for the book" : undefined,
          })
        ).filter((f) => !f.mimeType || f.mimeType.startsWith("image/"));
      } catch (e) {
        setImportState((s) => ({ ...s, message: e instanceof Error ? e.message : "Couldn't open Google Drive." }));
        return;
      }
      if (picked.length === 0) return;
      try {
        if (picked[0].parentId) {
          localStorage.setItem(LAST_FOLDER_KEY, picked[0].parentId);
          setImportState((s) => ({ ...s, hasFolder: true }));
        }
      } catch {
        // fine
      }
      await runImport(async () => (await Promise.all(picked.map((f) => getImageInfo(f.id)))).map(fromDrive), picked.length);
    },
    [runImport],
  );

  /** Photos shared into the app from the phone's gallery (Android "Share → Memory Book"). */
  const importShared = useCallback(async () => {
    if (!("caches" in window)) return;
    const inbox = await caches.open(SHARE_INBOX);
    const requests = await inbox.keys();
    if (requests.length === 0) return;
    const now = new Date().toISOString();
    const photos: IncomingPhoto[] = await Promise.all(
      requests.map(async (request) => {
        const response = await inbox.match(request);
        const blob = (await response?.blob()) ?? new Blob();
        return {
          id: `share-${request.url.split("/").pop()}`,
          name: decodeURIComponent(response?.headers.get("x-file-name") ?? "photo"),
          createdTime: response?.headers.get("x-last-modified") ?? now,
          load: async () => blob,
        };
      }),
    );
    // Take them out of the inbox first, so they're never brought in twice.
    await Promise.all(requests.map((r) => inbox.delete(r)));
    await runImport(async () => photos, photos.length);
  }, [runImport]);

  useEffect(() => {
    if (status === "ready" && access.canEdit) void importShared().catch(() => undefined);
  }, [status, access.canEdit, importShared]);

  const journalRef = useRef(journal);
  journalRef.current = journal;

  // Repair: an earlier version let you watch the book's own photos folder, which copied photos
  // over and over. Stop that, and remove the duplicate pages nobody has written on yet.
  const checkedFolder = useRef<string | null>(null);
  useEffect(() => {
    const watched = journal?.watchedFolder;
    // Check each watched folder once (the copy on this device may be older than the one in Drive).
    if (status !== "ready" || !watched || checkedFolder.current === watched.folderId) return;
    checkedFolder.current = watched.folderId;
    void (async () => {
      const own = await repository.bookFolderIds().catch((): string[] => []);
      if (!own.includes(watched.folderId)) return;
      let removedPhotos: string[] = [];
      let removed = 0;
      const saved = await enqueue(() =>
        repository.update((latest) => {
          // Empty pages made from the folder whose photos are copies (or old copies without a fingerprint).
          const isCopy = (m: Memory) =>
            m.photos.every(
              (p) =>
                !p.hash ||
                latest.memories.some((other) => other.id !== m.id && other.photos.some((o) => o.fileId !== p.fileId && samePhoto(o.hash, p.hash))),
            );
          const duplicates = latest.memories.filter((m) => m.source === "drive-folder" && !m.text.trim() && isCopy(m));
          removed = duplicates.length;
          removedPhotos = duplicates.flatMap((m) => m.photos.map((p) => p.fileId));
          return {
            ...latest,
            watchedFolder: undefined,
            memories: latest.memories.filter((m) => !duplicates.includes(m)),
          };
        }),
      );
      commit(saved);
      const inUse = photoIdsInUse(saved);
      await Promise.all(
        removedPhotos.filter((id) => !inUse.has(id)).map((id) => repository.removePhoto(id).catch(() => undefined)),
      );
      setImportState((s) => ({
        ...s,
        message: `Fixed: the book's own photos folder was being watched, which made copies of copies. Removed ${removed} duplicate page${removed === 1 ? "" : "s"}.`,
      }));
    })().catch(() => undefined);
  }, [status, journal?.watchedFolder, repository, enqueue, commit]);

  /* ---------------- growth ---------------- */

  const updateGrowth = useCallback(
    async (months: number, entry: GrowthEntry) => {
      const saved = await enqueue(() =>
        repository.update((latest) => {
          const growth = { ...(latest.growth ?? {}) };
          // Only the fields passed in change; empty ones are removed.
          const merged: GrowthEntry = { ...growth[String(months)] };
          for (const key of Object.keys(entry) as (keyof GrowthEntry)[]) merged[key] = entry[key]?.trim() || undefined;
          const clean = Object.fromEntries(Object.entries(merged).filter(([, v]) => v)) as GrowthEntry;
          if (Object.keys(clean).length) growth[String(months)] = clean;
          else delete growth[String(months)];
          return { ...latest, growth };
        }),
      );
      commit(saved);
    },
    [repository, enqueue, commit],
  );

  /* ---------------- duplicate photos ---------------- */

  const removeDuplicatePhotos = useCallback(
    async (onProgress?: (done: number, total: number) => void) => {
      const current = journal;
      if (!current) return { photos: 0, pages: 0 };
      // Keep the copy on pages you've written on, then the oldest.
      const order = [...current.memories]
        .filter((m) => !m.photos.some((p) => p.fileId.startsWith("local:")))
        .sort((a, b) => Number(!!b.text.trim()) - Number(!!a.text.trim()) || a.createdAt.localeCompare(b.createdAt));
      const all = order.flatMap((m) => m.photos);
      const hashes = new Map<string, string>();
      let done = 0;
      for (const photo of all) {
        onProgress?.(done++, all.length);
        if (photo.hash) {
          hashes.set(photo.fileId, photo.hash);
          continue;
        }
        try {
          const blob = (await idbGet<Blob>("photos", `${photo.fileId}:full`)) ?? (await repository.downloadPhoto(photo.fileId));
          hashes.set(photo.fileId, await photoHash(blob));
        } catch {
          // unreadable photo: leave it alone
        }
      }
      onProgress?.(all.length, all.length);

      const seen: string[] = [];
      const extra = new Set<string>();
      for (const photo of all) {
        const hash = hashes.get(photo.fileId);
        if (!hash) continue;
        if (seen.some((h) => samePhoto(h, hash))) extra.add(photo.fileId);
        else seen.push(hash);
      }

      let pagesRemoved = 0;
      const saved = await enqueue(() =>
        repository.update((latest) => {
          const memories = latest.memories
            .map((m) => ({
              ...m,
              photos: m.photos
                .filter((p) => !extra.has(p.fileId))
                .map((p) => (hashes.has(p.fileId) ? { ...p, hash: hashes.get(p.fileId) } : p)),
            }))
            .filter((m) => m.photos.length > 0 || m.text.trim());
          pagesRemoved = latest.memories.length - memories.length;
          return { ...latest, memories };
        }),
      );
      commit(saved);
      const inUse = photoIdsInUse(saved);
      await Promise.all(
        [...extra].filter((id) => !inUse.has(id)).map((id) => repository.removePhoto(id).catch(() => undefined)),
      );
      return { photos: extra.size, pages: pagesRemoved };
    },
    [journal, repository, enqueue, commit],
  );

  /* ---------------- family ---------------- */

  const listFamily = useCallback(() => repository.listFamily(), [repository]);
  const removeFamily = useCallback((id: string) => repository.removeFamily(id), [repository]);
  const inviteFamily = useCallback(
    async (email: string, role: FamilyRole) => {
      const child = journal?.settings.childName || "our little one";
      const message =
        `You're invited to ${child}'s Memory Book${role === "writer" ? " — you can add memories too" : ""}. ` +
        `Open ${window.location.origin} and sign in with Google using this email address, then choose "Open a book shared with me".`;
      await repository.inviteFamily(email, role, message);
    },
    [repository, journal],
  );
  const listBackups = useCallback(() => repository.listBackups(), [repository]);
  const trashBook = useCallback(() => enqueue(() => repository.trashBook()), [repository, enqueue]);
  const restoreFromBackup = useCallback(
    async (backupId: string) => {
      const { journal: saved, restored } = await enqueue(() => repository.restoreFromBackup(backupId));
      commit(saved);
      return restored;
    },
    [repository, enqueue, commit],
  );

  const openSharedBook = useCallback(async () => {
    // A book made with Memory Book usually opens as soon as it's shared with you;
    // if not, you choose it once in Google's own picker, which lets the app open just that book.
    let found = await repository.load().catch(() => null);
    if (!found) {
      const picked = await pickFromDrive(await getAccessToken(), { kind: "book" });
      if (picked.length === 0) return;
      found = await repository.load();
      if (!found)
        throw new Error(
          "That isn't a Memory Book shared with you. Ask the person who invited you to check they shared it with this Google account.",
        );
    }
    await reload();
  }, [repository, reload]);

  // The chosen handwriting font applies everywhere: book, editor, PDF.
  const chosenHand = journal?.settings.handwriting;
  useEffect(() => {
    const vars = handwritingStyle({ handwriting: chosenHand });
    const root = document.documentElement;
    for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
    return () => {
      for (const name of Object.keys(vars)) root.style.removeProperty(name);
    };
  }, [chosenHand]);

  /* ---------------- what the book shows ---------------- */

  // Local previews for photos that haven't uploaded yet.
  const localUrls = useRef(new Map<Blob, string>());
  const displayJournal = useMemo(() => {
    if (!journal) return null;
    let shown = journal;
    for (const draft of pending) {
      const photos = draft.input.photos.map((p, i): PhotoRef =>
        p.kind === "existing"
          ? p.ref
          : { fileId: p.uploadedId ?? `local:${draft.draftId}:${i}`, width: p.width, height: p.height },
      );
      shown = upsertMemory(shown, {
        id: draft.memoryId,
        date: draft.input.date,
        title: draft.input.title,
        text: draft.input.text,
        tags: draft.input.tags,
        photos,
        kind: draft.input.kind,
        sealedUntil: draft.input.sealedUntil || undefined,
        createdAt: draft.savedAt,
        updatedAt: draft.savedAt,
      });
    }
    return shown;
  }, [journal, pending]);

  // Which photos have a smaller copy in Drive (kept in a ref so the resolver and its cache stay the same).
  const smallCopies = useRef(new Map<string, string>());
  useEffect(() => {
    for (const m of journal?.memories ?? []) for (const p of m.photos) if (p.thumbId) smallCopies.current.set(p.fileId, p.thumbId);
    const cover = journal?.settings.coverPhoto;
    if (cover?.thumbId) smallCopies.current.set(cover.fileId, cover.thumbId);
  }, [journal]);
  const driveResolver = useMemo(
    () => createCachedPhotoResolver((id) => repository.downloadPhoto(id), (id) => smallCopies.current.get(id)),
    [repository],
  );
  const resolver = useCallback<PhotoResolver>(
    (fileId, size) => {
      if (fileId.startsWith("local:")) {
        const [, draftId, index] = fileId.split(":");
        const photo = pending.find((d) => d.draftId === draftId)?.input.photos[Number(index)];
        if (photo?.kind !== "new") return "";
        let url = localUrls.current.get(photo.blob);
        if (!url) {
          url = URL.createObjectURL(photo.blob);
          localUrls.current.set(photo.blob, url);
        }
        return url;
      }
      return driveResolver(fileId, size);
    },
    [pending, driveResolver],
  );

  const value: JournalContextValue = {
    status,
    error,
    notice,
    dismissNotice: () => setNotice(null),
    journal: displayJournal,
    pendingCount: pending.length,
    syncing,
    folderUrl,
    setupBook,
    saveMemory,
    deleteMemory,
    updateSettings,
    syncNow,
    reload,
    driveImport: importState,
    addFromDrive,
    access,
    removeDuplicatePhotos,
    updateGrowth,
    listFamily,
    inviteFamily,
    removeFamily,
    openSharedBook,
    listBackups,
    restoreFromBackup,
    trashBook,
    books,
    currentBookId: repository.currentBookId(),
    switchBook,
  };

  return (
    <JournalContext.Provider value={value}>
      <PhotoSourceProvider resolver={resolver}>{children}</PhotoSourceProvider>
    </JournalContext.Provider>
  );
}
