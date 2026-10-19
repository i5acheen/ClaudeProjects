import type { Memory } from "./types";
import { seededRandom } from "./random";
import { SCREEN_FORMAT, roominess, type PageFormat } from "./page-format";
import {
  DOODLES,
  TAPE_COLORS,
  fitFrameWidth,
  frameAspect,
  frameHeight,
  type DoodleKind,
  type FrameStyle,
  type TapeColor,
  type TapePattern,
} from "./frames";

/**
 * Decides where each photo sits on a memory page. All numbers are in `cqw`
 * (1% of the page width), so the same layout scales from a phone screen to
 * a printed page.
 *
 *   1 photo   → one large print
 *   2 photos  → side by side (or staggered when both are landscape)
 *   3 photos  → one large + two small
 *   4 photos  → a loose 2 × 2 collage
 */

/** Width of the content area between the page margins. */
export const CONTENT_WIDTH = 82;

export interface PlacedPhoto {
  index: number;
  left: number;
  top: number;
  width: number;
  rotate: number;
  frame: FrameStyle;
  tape?: { color: TapeColor; pattern: TapePattern; placement: "top" | "corners" };
}

export interface PlacedDoodle {
  kind: DoodleKind;
  color: string;
  size: number;
  rotate: number;
}

export interface MemoryLayout {
  areaHeight: number;
  photos: PlacedPhoto[];
  doodles: { top: PlacedDoodle; bottom: PlacedDoodle };
}

type Slot = { x: number; y: number; w: number; h: number };

function slotsFor(memory: Memory): Slot[] {
  const landscape = memory.photos.map((p) => frameAspect(p) >= 1.05);
  switch (memory.photos.length) {
    case 0:
      return [];
    case 1:
      return [{ x: 0.04, y: 0, w: 0.92, h: 1 }];
    case 2:
      return landscape[0] && landscape[1]
        ? [
            { x: 0, y: 0, w: 0.62, h: 0.64 },
            { x: 0.38, y: 0.36, w: 0.62, h: 0.64 },
          ]
        : [
            { x: 0, y: 0, w: 0.5, h: 0.97 },
            { x: 0.5, y: 0.03, w: 0.5, h: 0.97 },
          ];
    case 3:
      return [
        { x: 0, y: 0, w: 0.56, h: 1 },
        { x: 0.55, y: 0, w: 0.45, h: 0.52 },
        { x: 0.53, y: 0.5, w: 0.47, h: 0.5 },
      ];
    default:
      return [0, 1, 2, 3].map((i) => ({ x: (i % 2) * 0.5, y: Math.floor(i / 2) * 0.5, w: 0.5, h: 0.5 }));
  }
}

function photoAreaHeight(memory: Memory): number {
  const n = memory.photos.length;
  if (n === 0) return 0;
  const short = memory.text.length <= 200;
  if (n <= 2) return short ? 58 : 50;
  return short ? 62 : 56;
}

const INK_COLORS = ["var(--ink-rose)", "var(--ink-sage)", "var(--ink-honey)", "var(--ink-sky)", "var(--ink-terracotta)"];

export function layoutMemory(memory: Memory, part = 0, format: PageFormat = SCREEN_FORMAT): MemoryLayout {
  const rng = seededRandom(memory.id);
  const doodleRng = seededRandom(`${memory.id}:${part}`);
  const areaHeight = photoAreaHeight(memory) * Math.min(roominess(format), 1.12);
  const slots = slotsFor(memory);

  const primary: FrameStyle = rng.pick(["polaroid", "tape", "corners"] as const);
  const tapeColor = rng.pick(TAPE_COLORS);
  const tapePattern = rng.pick<TapePattern>(["stripes", "dots", "plain"]);
  const startSign = rng.next() < 0.5 ? -1 : 1;

  const photos = memory.photos.slice(0, 4).map((photo, index): PlacedPhoto => {
    const slot = slots[index];
    // Collages mix polaroids and taped prints; photo corners suit 1–2 photos.
    const frame: FrameStyle =
      memory.photos.length >= 3 ? (index % 2 === 0 ? (primary === "tape" ? "tape" : "polaroid") : primary === "tape" ? "polaroid" : "tape") : primary;
    const aspect = frameAspect(photo);
    const boxW = slot.w * CONTENT_WIDTH * 0.92;
    const boxH = slot.h * areaHeight * 0.92;
    const width = fitFrameWidth(frame, aspect, boxW, boxH);
    const height = frameHeight(frame, aspect, width);
    const jitterX = rng.range(-1, 1);
    const jitterY = rng.range(-0.8, 0.8);
    const left = slot.x * CONTENT_WIDTH + (slot.w * CONTENT_WIDTH - width) / 2 + jitterX;
    const top = slot.y * areaHeight + (slot.h * areaHeight - height) / 2 + jitterY;
    const sign = index % 2 === 0 ? startSign : -startSign;
    const rotate = sign * rng.range(0.6, 2);

    let tape: PlacedPhoto["tape"];
    if (frame === "tape") {
      tape = { color: tapeColor, pattern: tapePattern, placement: rng.next() < 0.5 ? "top" : "corners" };
    } else if (frame === "polaroid" && rng.next() < 0.45) {
      tape = { color: rng.pick(TAPE_COLORS), pattern: tapePattern, placement: "top" };
    }

    return { index, left, top, width, rotate, frame, tape };
  });

  const doodle = (kinds: readonly DoodleKind[], min: number, max: number): PlacedDoodle => ({
    kind: doodleRng.pick(kinds),
    color: doodleRng.pick(INK_COLORS),
    size: doodleRng.range(min, max),
    rotate: doodleRng.range(-20, 20),
  });

  return {
    areaHeight,
    photos,
    doodles: {
      top: doodle(["star", "heart", "sparkle", "flower", "sun", "moon"], 6.5, 9),
      bottom: doodle(DOODLES, 5, 7),
    },
  };
}
