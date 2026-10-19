"use client";

import type { Journal, Memory, PhotoRef } from "./types";
import type { JournalRepository } from "./repository";
import { DriveError, OfflineError, SignedOutError, downloadFile, listImagesInFolder, type DriveImage } from "./drive/client";
import { photoTakenDate, resizePhoto } from "./images";
import { primePhotoCache } from "./photo-cache";
import { samePhoto } from "./photo-hash";

/**
 * Brings new photos from your watched Drive folder into the book.
 *
 * Each new photo is copied into the book's own photos/ folder (resized to
 * 2000px) — your original stays exactly where you put it. Photos taken on
 * the same day become one memory (up to 4 photos), waiting for your words.
 */

/** Keeps each check quick; the rest come in on the next check. */
const MAX_PER_CHECK = 24;
const MAX_PHOTOS_PER_MEMORY = 4;

export interface ImportOutcome {
  journal: Journal;
  added: number;
  /** Photos skipped because the same picture is already in the book. */
  alreadyInBook: number;
  skipped: number;
  remaining: number;
}

/** "2026:06:15 10:30:00" (camera time) → "2026-06-15" */
function cameraDate(file: DriveImage): string | undefined {
  const match = file.imageMediaMetadata?.time?.match(/^(\d{4})[:-](\d{2})[:-](\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

function localDay(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Problems that mean "stop and try later", rather than "this one photo is unreadable". */
const isFatal = (e: unknown) =>
  e instanceof SignedOutError || e instanceof OfflineError || (e instanceof DriveError && (e.status === 401 || e.status === 403 || e.status === 429));

interface ImportedPhoto {
  sourceId: string;
  date: string;
  /** No date found in the photo or its name — the upload day is used and flagged for checking. */
  dateGuessed: boolean;
  photo: PhotoRef;
}

const hashesIn = (journal: Journal) =>
  journal.memories.flatMap((m) => m.photos.map((p) => p.hash)).filter((h): h is string => !!h);

export async function importFromWatchedFolder(
  repository: JournalRepository,
  journal: Journal,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportOutcome | null> {
  const watched = journal.watchedFolder;
  if (!watched) return null;

  const known = new Set([...watched.importedFileIds, ...watched.skippedFileIds]);
  const fresh = (await listImagesInFolder(watched.folderId)).filter(
    // Never bring in the book's own photo copies (that would copy them again and again).
    (f) => !known.has(f.id) && !f.appProperties?.memoryBook,
  );
  if (fresh.length === 0) return { journal, added: 0, alreadyInBook: 0, skipped: 0, remaining: 0 };

  const batch = fresh.slice(0, MAX_PER_CHECK);
  const imported: ImportedPhoto[] = [];
  const skipped: string[] = [];
  /** Photos that are already in the book: noted as handled, but not added again. */
  const alreadyInBook: string[] = [];
  const knownHashes = hashesIn(journal);

  for (const [i, file] of batch.entries()) {
    onProgress?.(i, batch.length);
    try {
      const original = await downloadFile(file.id);
      const resized = await resizePhoto(original);
      if (resized.hash && knownHashes.some((h) => samePhoto(h, resized.hash))) {
        alreadyInBook.push(file.id);
        continue;
      }
      if (resized.hash) knownHashes.push(resized.hash);
      const taken = cameraDate(file) ?? (await photoTakenDate(original, file.name));
      const date = taken ?? localDay(file.createdTime);
      const baseName = file.name.replace(/\.[^.]+$/, "");
      const fileId = await repository.uploadPhoto(resized.blob, `${date}-${baseName}.jpg`);
      await primePhotoCache(fileId, resized.blob);
      imported.push({
        sourceId: file.id,
        date,
        dateGuessed: !taken,
        photo: { fileId, width: resized.width, height: resized.height, hash: resized.hash },
      });
    } catch (e) {
      if (isFatal(e)) {
        if (imported.length === 0) throw e;
        break; // keep what we have; the rest is tried next time
      }
      skipped.push(file.id); // e.g. a HEIC photo this browser can't open
    }
  }
  onProgress?.(batch.length, batch.length);

  let duplicates: ImportedPhoto[] = [];
  const saved = await repository.update((latest) => {
    // Another device may have imported some of these in the meantime.
    // …or added the same picture another way.
    const already = new Set(latest.watchedFolder?.importedFileIds ?? []);
    const before = new Set(hashesIn(journal));
    const addedMeanwhile = hashesIn(latest).filter((h) => !before.has(h));
    duplicates = imported.filter(
      (p) => already.has(p.sourceId) || addedMeanwhile.some((h) => samePhoto(h, p.photo.hash)),
    );
    const toAdd = imported.filter((p) => !already.has(p.sourceId));
    const memories = addToMemories(latest.memories, toAdd);
    const current = latest.watchedFolder ?? watched;
    return {
      ...latest,
      memories,
      watchedFolder: {
        ...current,
        importedFileIds: [...current.importedFileIds, ...toAdd.map((p) => p.sourceId), ...alreadyInBook],
        skippedFileIds: [...current.skippedFileIds, ...skipped.filter((id) => !current.skippedFileIds.includes(id))],
        lastCheckedAt: new Date().toISOString(),
      },
    };
  });

  // Copies made twice by two devices at once: bin the spare ones.
  await Promise.all(duplicates.map((p) => repository.removePhoto(p.photo.fileId).catch(() => undefined)));

  return {
    journal: saved,
    added: imported.length - duplicates.length,
    alreadyInBook: alreadyInBook.length,
    skipped: skipped.length,
    remaining: fresh.length - batch.length,
  };
}

/** Adds photos to same-day memories that are still waiting for words, or starts new ones. */
function addToMemories(memories: Memory[], photos: ImportedPhoto[]): Memory[] {
  const result = [...memories];
  const now = new Date().toISOString();
  for (const item of photos) {
    const index = result.findIndex(
      (m) =>
        m.source === "drive-folder" &&
        m.date === item.date &&
        !m.text.trim() &&
        m.photos.length < MAX_PHOTOS_PER_MEMORY,
    );
    if (index >= 0 && !!result[index].dateGuessed === item.dateGuessed) {
      const target = result[index];
      result[index] = { ...target, photos: [...target.photos, item.photo], updatedAt: now };
    } else {
      result.push({
        id: `drive-${item.sourceId}`,
        date: item.date,
        text: "",
        tags: [],
        photos: [item.photo],
        source: "drive-folder",
        dateGuessed: item.dateGuessed || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
  return result;
}
