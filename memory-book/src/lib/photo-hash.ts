"use client";

/**
 * A tiny visual fingerprint of a photo (a 64-bit "difference hash").
 * It stays the same when a photo is resized or saved again as JPEG, so the
 * app can tell "this photo is already in the book" even for copies.
 */

const W = 9;
const H = 8;

export async function photoHash(source: Blob | ImageBitmap): Promise<string> {
  const bitmap = source instanceof Blob ? await createImageBitmap(source) : source;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return "";
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, W, H);
    const { data } = ctx.getImageData(0, 0, W, H);
    const gray = (x: number, y: number) => {
      const i = (y * W + x) * 4;
      return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    };
    let bits = "";
    for (let y = 0; y < H; y++) for (let x = 0; x < W - 1; x++) bits += gray(x, y) < gray(x + 1, y) ? "1" : "0";
    let hex = "";
    for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    return hex;
  } finally {
    if (source instanceof Blob) bitmap.close();
  }
}

function distance(a: string, b: string): number {
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

/** True when two fingerprints are the same picture (allowing for re-saving). */
export function samePhoto(a?: string, b?: string): boolean {
  return !!a && !!b && a.length === b.length && distance(a, b) <= 3;
}
