import type { PhotoRef } from "./types";

/** Geometry and vocabulary of the hand-made decorations, shared by screen and print. */

export type FrameStyle = "polaroid" | "tape" | "corners";

export const TAPE_COLORS = ["rose", "sage", "honey", "sky", "lilac"] as const;
export type TapeColor = (typeof TAPE_COLORS)[number];
export type TapePattern = "stripes" | "dots" | "plain";

export const DOODLES = ["star", "heart", "sparkle", "flower", "swirl", "moon", "sun", "dots"] as const;
export type DoodleKind = (typeof DOODLES)[number];

/** Border thickness as a fraction of the frame width: [side, top, bottom]. */
export const FRAME_BORDERS: Record<FrameStyle, [number, number, number]> = {
  polaroid: [0.055, 0.055, 0.19],
  tape: [0.028, 0.028, 0.028],
  corners: [0.022, 0.022, 0.022],
};

/** Keep extreme panoramas/tall shots from looking odd — they get cropped. */
export function frameAspect(photo: PhotoRef): number {
  return Math.min(1.55, Math.max(0.68, photo.width / photo.height));
}

/** Frame height for a given frame width (same units). */
export function frameHeight(style: FrameStyle, aspect: number, width: number): number {
  const [side, top, bottom] = FRAME_BORDERS[style];
  return width * (top + bottom + (1 - 2 * side) / aspect);
}

/** Largest frame width that fits a `w` × `h` box once the border is added. */
export function fitFrameWidth(style: FrameStyle, aspect: number, w: number, h: number): number {
  return Math.min(w, h / frameHeight(style, aspect, 1));
}
