"use client";

/** Photo processing in the browser, before anything is uploaded. */

export interface ProcessedPhoto {
  blob: Blob;
  width: number;
  height: number;
}

export const MAX_PHOTO_SIZE = 2000;
const JPEG_QUALITY = 0.86;

async function decode(file: Blob): Promise<ImageBitmap> {
  try {
    // Turns the photo upright according to the camera's orientation tag.
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error(
      "This photo couldn't be opened. If it's an iPhone HEIC photo, try choosing it from your phone, which converts it automatically.",
    );
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
    return await encode(bitmap, maxSize, JPEG_QUALITY);
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

/** The date the photo was taken (`YYYY-MM-DD`), if the camera recorded it. */
export async function photoTakenDate(file: Blob): Promise<string | undefined> {
  try {
    const exifr = (await import("exifr")).default;
    const data = (await exifr.parse(file, ["DateTimeOriginal", "CreateDate"])) as
      | { DateTimeOriginal?: Date; CreateDate?: Date }
      | undefined;
    const date = data?.DateTimeOriginal ?? data?.CreateDate;
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return undefined;
    // EXIF times are the camera's local time, so read them back as local.
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  } catch {
    return undefined;
  }
}
