"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { BookSettings, Journal, Memory, PhotoRef, Tag } from "@/lib/types";
import type { JournalRepository } from "@/lib/repository";
import { DriveRepository } from "@/lib/drive/drive-repository";
import { OfflineError, SignedOutError } from "@/lib/drive/client";
import { idbDelete, idbGet, idbGetAll, idbPut } from "@/lib/idb";
import { createCachedPhotoResolver, primePhotoCache } from "@/lib/photo-cache";
import { PhotoSourceProvider, type PhotoResolver } from "@/components/book/PhotoSource";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type DraftPhoto =
  | { kind: "existing"; ref: PhotoRef }
  | { kind: "new"; blob: Blob; width: number; height: number; uploadedId?: string };

export interface MemoryInput {
  id?: string;
  date: string;
  title?: string;
  text: string;
  tags: Tag[];
  photos: DraftPhoto[];
}

/** A memory saved on this device, waiting to be uploaded to Drive. */
interface PendingSave {
  draftId: string;
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
  /** The book as saved in Drive, plus anything still waiting to upload. */
  journal: Journal | null;
  pendingCount: number;
  syncing: boolean;
  folderUrl: string | null;
  setupBook(settings: BookSettings): Promise<void>;
  /** Saves locally first, then uploads. Resolves with "saved" or "queued" (kept on this device). */
  saveMemory(input: MemoryInput, onProgress?: (message: string) => void): Promise<"saved" | "queued">;
  deleteMemory(id: string): Promise<void>;
  updateSettings(settings: BookSettings, newCover?: { blob: Blob; width: number; height: number }): Promise<void>;
  syncNow(): Promise<void>;
  reload(): Promise<void>;
}

const JournalContext = createContext<JournalContextValue | null>(null);

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

function friendlyError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
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

const cacheKey = (owner: string) => `memory-book:journal:${owner}`;

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
  const repository = useMemo(() => providedRepository ?? new DriveRepository(), [providedRepository]);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [journal, setJournal] = useState<Journal | null>(null);
  const [pending, setPending] = useState<PendingSave[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [folderUrl, setFolderUrl] = useState<string | null>(null);

  const commit = useCallback(
    (next: Journal) => {
      setJournal(next);
      try {
        localStorage.setItem(cacheKey(owner), JSON.stringify(next));
      } catch {
        // storage full or blocked — the offline copy is only a convenience
      }
    },
    [owner],
  );

  const handleError = useCallback((e: unknown) => {
    if (e instanceof SignedOutError) setStatus("signed-out");
    setError(friendlyError(e));
  }, []);

  /* ---------------- loading ---------------- */

  const reload = useCallback(async () => {
    setError(null);
    try {
      const loaded = await repository.load();
      setFolderUrl(repository.folderUrl());
      if (loaded) {
        commit(loaded);
        setStatus("ready");
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
      const cached = localStorage.getItem(cacheKey(owner));
      if (cached) {
        setJournal(JSON.parse(cached) as Journal);
        setStatus("ready");
      }
    } catch {
      // ignore a damaged offline copy
    }
    idbGetAll<PendingSave>("drafts")
      .then((drafts) => setPending(drafts.sort((a, b) => a.savedAt.localeCompare(b.savedAt))))
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
        photo.uploadedId = await repository.uploadPhoto(
          photo.blob,
          `${draft.input.date}-${draft.memoryId.slice(0, 8)}-${i + 1}.jpg`,
        );
        await primePhotoCache(photo.uploadedId, photo.blob);
        await idbPut("drafts", draft.draftId, draft);
      }

      onProgress?.("Writing it into the book…");
      const photos: PhotoRef[] = draft.input.photos.map((p) =>
        p.kind === "existing" ? p.ref : { fileId: p.uploadedId!, width: p.width, height: p.height },
      );
      const memory: Memory = {
        id: draft.memoryId,
        date: draft.input.date,
        title: draft.input.title?.trim() || undefined,
        text: draft.input.text,
        tags: draft.input.tags,
        photos,
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
          const drafts = await idbGetAll<PendingSave>("drafts");
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

  const setupBook = useCallback(
    async (settings: BookSettings) => {
      const created = await repository.create(settings);
      setFolderUrl(repository.folderUrl());
      commit(created);
      setStatus("ready");
      setError(null);
    },
    [repository, commit],
  );

  const saveMemory = useCallback(
    async (input: MemoryInput, onProgress?: (message: string) => void): Promise<"saved" | "queued"> => {
      const memoryId = input.id ?? newId();
      const previous = journal?.memories.find((m) => m.id === memoryId);
      const draft: PendingSave = {
        draftId: newId(),
        memoryId,
        input: { date: input.date, title: input.title, text: input.text, tags: input.tags, photos: input.photos },
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
        const fileId = await repository.uploadPhoto(newCover.blob, `cover-${Date.now()}.jpg`);
        await primePhotoCache(fileId, newCover.blob);
        next = { ...settings, coverPhoto: { fileId, width: newCover.width, height: newCover.height } };
      }
      const oldCover = journal?.settings.coverPhoto?.fileId;
      const saved = await repository.update((latest) => ({ ...latest, settings: next }));
      commit(saved);
      if (oldCover && !photoIdsInUse(saved).has(oldCover)) await repository.removePhoto(oldCover).catch(() => undefined);
    },
    [journal, repository, commit],
  );

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
        createdAt: draft.savedAt,
        updatedAt: draft.savedAt,
      });
    }
    return shown;
  }, [journal, pending]);

  const driveResolver = useMemo(() => createCachedPhotoResolver((id) => repository.downloadPhoto(id)), [repository]);
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
  };

  return (
    <JournalContext.Provider value={value}>
      <PhotoSourceProvider resolver={resolver}>{children}</PhotoSourceProvider>
    </JournalContext.Provider>
  );
}
