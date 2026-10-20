"use client";

import type { Journal, Memory, PhotoRef } from "./types";
import type { JournalRepository } from "./repository";
import { DriveError, OfflineError, SignedOutError, downloadFile, type DriveImage } from "./drive/client";
import { photoTakenDate, resizePhoto } from "./images";
import { uploadBookPhoto } from "./upload";
import { samePhoto } from "./photo-hash";

/**
 * Brings photos you picked from your Google Drive into the book.
 *
 * Each photo is copied into the book's own photos/ folder (resized, with
 * location data removed) — your original stays exactly where it is. Photos
 * taken on the same day become one memory (up to 4 photos), waiting for your
 * words. Photos already in the book are skipped.
 */

/** Saved in small batches, so a long import never loses much if interrupted. */
const BATCH = 12;
const MAX_PHOTOS_PER_MEMORY = 4;

export interface ImportOutcome {
  journal: Journal;
  added: number;
  /** Photos skipped because the same picture is already in the book. */
  alreadyInBook: number;
  skipped: number;
  remaining: number;
  /** The photos not imported yet (pass these to the next call). */
  rest: IncomingPhoto[];
}

/** A photo coming into the book: picked in Google Drive, or shared from the phone's gallery. */
export interface IncomingPhoto {
  /** Unique per source (Drive file ID, or a share ID). */
  id: string;
  name?: string;
  /** When it was added (used only if no date is found in the photo itself). */
  createdTime?: string;
  /** Camera time as Drive reports it, e.g. "2026:06:15 10:30:00". */
  cameraTime?: string;
  /** One of the book's own copies (never copy those again). */
  ownCopy?: boolean;
  load(): Promise<Blob>;
}

export const fromDrive = (file: DriveImage): IncomingPhoto => ({
  id: file.id,
  name: file.name,
  createdTime: file.createdTime,
  cameraTime: file.imageMediaMetadata?.time,
  ownCopy: !!file.appProperties?.memoryBook,
  load: () => downloadFile(file.id),
});

/** "2026:06:15 10:30:00" (camera time) → "2026-06-15" */
function cameraDate(file: IncomingPhoto): string | undefined {
  const match = file.cameraTime?.match(/^(\d{4})[:-](\d{2})[:-](\d{2})/);
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

/** Imports the next batch of `files`; call again with `remaining` until it reaches 0. */
export async function importPhotos(
  repository: JournalRepository,
  journal: Journal,
  files: IncomingPhoto[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportOutcome> {
  // Never bring in the book's own photo copies (that would copy them again and again).
  const fresh = files.filter((f) => !f.ownCopy);
  if (fresh.length === 0) return { journal, added: 0, alreadyInBook: files.length, skipped: 0, remaining: 0, rest: [] };

  const batch = fresh.slice(0, BATCH);
  const imported: ImportedPhoto[] = [];
  const skipped: string[] = [];
  /** Photos that are already in the book: noted as handled, but not added again. */
  const alreadyInBook: string[] = [];
  const knownHashes = hashesIn(journal);

  for (const [i, file] of batch.entries()) {
    onProgress?.(i, batch.length);
    try {
      const original = await file.load();
      const resized = await resizePhoto(original);
      if (resized.hash && knownHashes.some((h) => samePhoto(h, resized.hash))) {
        alreadyInBook.push(file.id);
        continue;
      }
      if (resized.hash) knownHashes.push(resized.hash);
      const taken = cameraDate(file) ?? (await photoTakenDate(original, file.name));
      const date = taken ?? localDay(file.createdTime ?? new Date().toISOString());
      const baseName = (file.name ?? "photo").replace(/\.[^.]+$/, "");
      const { fileId, thumbId } = await uploadBookPhoto(repository, resized.blob, `${date}-${baseName}.jpg`);
      imported.push({
        sourceId: file.id,
        date,
        dateGuessed: !taken,
        photo: { fileId, width: resized.width, height: resized.height, hash: resized.hash, thumbId },
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
    // The same picture may have been added another way in the meantime (e.g. on another phone).
    const before = new Set(hashesIn(journal));
    const addedMeanwhile = hashesIn(latest).filter((h) => !before.has(h));
    const ids = new Set(latest.memories.map((m) => m.id));
    duplicates = imported.filter((p) => ids.has(`drive-${p.sourceId}`) || addedMeanwhile.some((h) => samePhoto(h, p.photo.hash)));
    const toAdd = imported.filter((p) => !duplicates.includes(p));
    return { ...latest, memories: addToMemories(latest.memories, toAdd) };
  });

  // Copies made twice by two devices at once: bin the spare ones.
  await Promise.all(duplicates.map((p) => repository.removePhoto(p.photo.fileId).catch(() => undefined)));

  return {
    journal: saved,
    added: imported.length - duplicates.length,
    alreadyInBook: alreadyInBook.length,
    skipped: skipped.length,
    remaining: fresh.length - batch.length,
    rest: fresh.slice(batch.length),
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
