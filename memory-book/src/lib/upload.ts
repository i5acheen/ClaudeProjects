"use client";

import type { JournalRepository } from "./repository";
import { isSpaceSaver, makePagePhoto, shrinkForSpace } from "./images";
import { primePhotoCache } from "./photo-cache";

/**
 * Uploads a photo to the book, plus a smaller copy (~1000px) used to show the
 * book quickly on screen. The full photo is kept for printing and zoom.
 * If the small copy can't be made, the photo is still saved.
 */
export async function uploadBookPhoto(
  repository: JournalRepository,
  photo: Blob,
  name: string,
): Promise<{ fileId: string; thumbId?: string }> {
  // Drive nearly full: a photo prepared earlier at full size (e.g. waiting on this device) is made smaller first.
  if (isSpaceSaver()) photo = await shrinkForSpace(photo).catch(() => photo);
  const fileId = await repository.uploadPhoto(photo, name);
  let thumbId: string | undefined;
  let page: Blob | undefined;
  try {
    page = await makePagePhoto(photo);
    thumbId = await repository.uploadSmallCopy(page, name.replace(/\.jpe?g$/i, "") + "-small.jpg", fileId);
  } catch {
    // the full photo is enough
  }
  await primePhotoCache(fileId, photo, page);
  return { fileId, thumbId };
}
