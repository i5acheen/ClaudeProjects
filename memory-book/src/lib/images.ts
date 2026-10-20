"use client";

import { photoHash } from "./photo-hash";

/** Photo processing in the browser, before anything is uploaded. */

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
  /** Visual fingerprint, to spot a photo that's already in the book. */
  hash?: string;
}

/** Sharp enough to print a full A4 page well. */
export const MAX_PHOTO_SIZE = 2400;
const JPEG_QUALITY = 0.88;
/** The smaller copy used to show the book on screen. */
export const PAGE_PHOTO_SIZE = 1000;
/** Bigger files are refused (the phone or browser could struggle to open them). */
export const MAX_FILE_BYTES = 40 * 1024 * 1024;

const isHeic = async (file: Blob) => {
  if (/image\/hei[cf]/i.test(file.type) || (file instanceof File && /\.hei[cf]$/i.test(file.name))) return true;
  // The file's own signature, in case the type is missing: "ftypheic", "ftypheix", "ftypmif1"…
  const head = new TextDecoder().decode(await file.slice(4, 12).arrayBuffer());
  return /^ftyp(hei|hev|mif1|msf1)/.test(head);
};

/** Decodes an iPhone (HEIC) photo in a separate, sandboxed worker (public/heic-worker.js). */
async function decodeHeic(file: Blob): Promise<ImageBitmap> {
  const worker = new Worker("/heic-worker.js");
  try {
    const result = await new Promise<{ ok: boolean; width: number; height: number; data: ArrayBuffer }>((resolve, reject) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.onerror = () => reject(new Error("decoder failed"));
      void file.arrayBuffer().then((buffer) => worker.postMessage(buffer, [buffer]));
    });
    if (!result.ok) throw new Error("decoder failed");
    return await createImageBitmap(new ImageData(new Uint8ClampedArray(result.data), result.width, result.height));
  } finally {
    worker.terminate();
  }
}

async function decode(file: Blob): Promise<ImageBitmap> {
  if (file.size > MAX_FILE_BYTES) throw new Error("This photo is too large (over 40 MB). Please choose a smaller copy.");
  try {
    // Turns the photo upright according to the camera's orientation tag.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // iPhone photos (HEIC) open natively in Safari; other browsers need a converter, loaded only when needed.
    if (await isHeic(file).catch(() => false)) {
      try {
        return await decodeHeic(file);
      } catch {
        // fall through to the message below
      }
    }
    throw new Error("This photo couldn't be opened. It may be damaged, or a kind of file that isn't a photo.");
  }
}

async function encode(bitmap: ImageBitmap, maxSize: number, quality: number): Promise<ProcessedPhoto> {
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser couldn't process this photo.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Your browser couldn't process this photo.");
  return { blob, width, height };
}

/** Shrinks a photo to at most 2000px on its longest side, as a good-quality JPEG. */
export async function resizePhoto(file: Blob, maxSize = MAX_PHOTO_SIZE): Promise<ProcessedPhoto> {
  const bitmap = await decode(file);
  try {
    const processed = await encode(bitmap, maxSize, JPEG_QUALITY);
    return { ...processed, hash: await photoHash(bitmap).catch(() => undefined) };
  } finally {
    bitmap.close();
  }
}

/** The ~1000px copy saved next to each photo, for showing the book on screen. */
export async function makePagePhoto(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    return (await encode(bitmap, PAGE_PHOTO_SIZE, 0.82)).blob;
  } finally {
    bitmap.close();
  }
}

/** A small copy for the timeline and quick loading. */
export async function makeThumbnail(blob: Blob, maxSize = 520): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    return (await encode(bitmap, maxSize, 0.8)).blob;
  } finally {
    bitmap.close();
  }
}

/** "IMG_20260507_101500.jpg", "PXL_20260507…", "2026-05-07 10.15.00.jpg", "WhatsApp Image 2026-05-07…" → "2026-05-07" */
export function dateFromFileName(name: string): string | undefined {
  const match = name.match(/(20\d{2})[-_.]?(0[1-9]|1[0-2])[-_.]?(0[1-9]|[12]\d|3[01])(?!\d)/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : undefined;
}

/**
 * The date the photo was taken (`YYYY-MM-DD`): from the camera's own record
 * inside the file, or else from a date in the file name.
 */
export async function photoTakenDate(file: Blob, fileName?: string): Promise<string | undefined> {
  try {
    const exifr = (await import("exifr")).default;
    const data = (await exifr.parse(file, ["DateTimeOriginal", "CreateDate", "DateTimeDigitized", "ModifyDate"])) as
      | Record<string, Date | undefined>
      | undefined;
    const date = data?.DateTimeOriginal ?? data?.CreateDate ?? data?.DateTimeDigitized ?? data?.ModifyDate;
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      // EXIF times are the camera's local time, so read them back as local.
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    }
  } catch {
    // no readable camera data
  }
  const name = fileName ?? (file instanceof File ? file.name : "");
  return name ? dateFromFileName(name) : undefined;
}
