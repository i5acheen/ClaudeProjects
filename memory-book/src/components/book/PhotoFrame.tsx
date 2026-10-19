"use client";

import type { CSSProperties } from "react";
import type { PhotoRef } from "@/lib/types";
import { FRAME_BORDERS, frameAspect, type FrameStyle, type TapeColor, type TapePattern } from "@/lib/frames";
import { usePhotoSrc, type PhotoSize } from "./PhotoSource";

/**
 * A photo "stuck into" the book: as a polaroid, held with washi tape, or
 * slipped into little black photo corners.
 */

interface WashiTapeProps {
  color: TapeColor;
  pattern: TapePattern;
  style?: CSSProperties;
}

export function WashiTape({ color, pattern, style }: WashiTapeProps) {
  return <span className={`washi washi--${color} washi--${pattern}`} style={style} aria-hidden />;
}

interface PhotoFrameProps {
  photo: PhotoRef;
  frame: FrameStyle;
  /** Frame width in cqw (page-relative units). */
  width: number;
  rotate: number;
  tape?: { color: TapeColor; pattern: TapePattern; placement: "top" | "corners" };
  size?: PhotoSize;
  style?: CSSProperties;
  alt?: string;
}

export function PhotoFrame({ photo, frame, width, rotate, tape, size = "full", style, alt = "" }: PhotoFrameProps) {
  const src = usePhotoSrc(photo.fileId, size);
  const aspect = frameAspect(photo);
  const [side, top, bottom] = FRAME_BORDERS[frame];
  const tapeLen = Math.max(9, Math.min(17, width * 0.36));

  return (
    <figure
      className={`photo-frame photo-frame--${frame}`}
      style={{
        width: `${width}cqw`,
        padding: `${top * width}cqw ${side * width}cqw ${bottom * width}cqw`,
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      <div className="photo-frame__image" style={{ aspectRatio: aspect }}>
        {src ? <img src={src} alt={alt} draggable={false} loading="lazy" decoding="async" /> : null}
      </div>

      {frame === "corners" && (
        <>
          <span className="photo-corner photo-corner--tl" />
          <span className="photo-corner photo-corner--tr" />
          <span className="photo-corner photo-corner--bl" />
          <span className="photo-corner photo-corner--br" />
        </>
      )}

      {tape?.placement === "top" && (
        <WashiTape
          color={tape.color}
          pattern={tape.pattern}
          style={{ width: `${tapeLen}cqw`, left: "50%", top: 0, transform: `translate(-50%, -45%) rotate(${-rotate * 1.5 - 2}deg)` }}
        />
      )}
      {tape?.placement === "corners" && (
        <>
          <WashiTape
            color={tape.color}
            pattern={tape.pattern}
            style={{ width: `${tapeLen * 0.8}cqw`, left: 0, top: 0, transform: "translate(-32%, 10%) rotate(-42deg)" }}
          />
          <WashiTape
            color={tape.color}
            pattern={tape.pattern}
            style={{ width: `${tapeLen * 0.8}cqw`, right: 0, bottom: 0, transform: "translate(32%, -10%) rotate(-42deg)" }}
          />
        </>
      )}
    </figure>
  );
}
