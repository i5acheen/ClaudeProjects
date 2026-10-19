"use client";

import type { PhotoResolver } from "@/components/book/PhotoSource";
import { idbGet, idbPut } from "./idb";
import { makeThumbnail } from "./images";

/**
 * Turns a Drive file ID into something an <img> can show.
 *
 * Drive photos are private, so they're downloaded with the user's token and
 * kept in the browser (IndexedDB): a small thumbnail for the timeline and
 * the full photo for the book. Downloads run a few at a time.
 */

const MAX_PARALLEL = 4;
let active = 0;
const queue: (() => void)[] = [];

async function limited<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_PARALLEL) await new Promise<void>((resolve) => queue.push(resolve));
  active++;
  try {
    return await task();
  } finally {
    active--;
    queue.shift()?.();
  }
}

export function createCachedPhotoResolver(download: (fileId: string) => Promise<Blob>): PhotoResolver {
  const urls = new Map<string, Promise<string>>();
  const fullBlobs = new Map<string, Promise<Blob>>();

  const getFull = (fileId: string): Promise<Blob> => {
    let pending = fullBlobs.get(fileId);
    if (!pending) {
      pending = (async () => {
        const cached = await idbGet<Blob>("photos", `${fileId}:full`).catch(() => undefined);
        if (cached) return cached;
        const blob = await limited(() => download(fileId));
        await idbPut("photos", `${fileId}:full`, blob).catch(() => undefined);
        return blob;
      })();
      pending.catch(() => fullBlobs.delete(fileId));
      fullBlobs.set(fileId, pending);
    }
    return pending;
  };

  const getThumb = async (fileId: string): Promise<Blob> => {
    const cached = await idbGet<Blob>("photos", `${fileId}:thumb`).catch(() => undefined);
    if (cached) return cached;
    const thumb = await makeThumbnail(await getFull(fileId));
    await idbPut("photos", `${fileId}:thumb`, thumb).catch(() => undefined);
    return thumb;
  };

  return (fileId, size) => {
    if (fileId.startsWith("demo:")) return `/demo/${fileId.slice(5)}`;
    const key = `${fileId}:${size}`;
    let url = urls.get(key);
    if (!url) {
      url = (size === "thumb" ? getThumb(fileId) : getFull(fileId)).then((blob) => URL.createObjectURL(blob));
      url.catch(() => urls.delete(key));
      urls.set(key, url);
    }
    return url;
  };
}

/** Pre-fills the cache right after an upload, so a new photo shows instantly. */
export async function primePhotoCache(fileId: string, blob: Blob) {
  await idbPut("photos", `${fileId}:full`, blob).catch(() => undefined);
}
