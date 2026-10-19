import type { CSSProperties } from "react";
import type { DoodleKind } from "@/lib/frames";

/**
 * Small hand-drawn ink doodles. The paths are drawn slightly imperfect on
 * purpose, and the shared `#ink-wobble` filter (see InkFilters) roughens the
 * line so it looks like a pen on paper.
 */

const PATHS: Record<DoodleKind, { d: string; fill?: boolean }> = {
  star: {
    d: "M12 2.6 L14.5 9.1 L21.3 9.3 L16 13.6 L18.1 20.5 L12.1 16.6 L6.2 20.7 L7.9 13.8 L2.7 9.5 L9.5 9.2 Z",
    fill: true,
  },
  heart: {
    d: "M12.1 20.3 C6.4 16.2 2.9 12.6 3.3 8.6 C3.8 5.1 7.7 3.9 10 6.3 C10.9 7.2 11.5 8.2 12 9.1 C12.6 7.8 13.6 6.4 15.1 5.6 C17.9 4.2 21.1 5.9 20.9 9.4 C20.6 13.3 16.5 16.7 12.1 20.3",
    fill: true,
  },
  sparkle: { d: "M12 2.5 C12.6 8.8 13.3 11.2 21.4 12 C13.3 12.9 12.6 15.1 12 21.5 C11.4 15.1 10.8 12.9 2.6 12 C10.8 11.2 11.4 8.8 12 2.5 Z", fill: true },
  flower: {
    d: "M12 10.2 C10.4 6.6 11 3.2 12.2 3.1 C13.5 3 13.8 6.7 12 10.2 M13.6 11.2 C16.6 8.6 20 8.6 20.3 9.8 C20.6 11.1 17 12.3 13.6 11.2 M13 13.2 C15 16.6 15 20.1 13.8 20.4 C12.5 20.6 11.6 17 13 13.2 M10.8 13.1 C8.5 16.2 5.2 17 4.7 15.8 C4.2 14.6 7.2 12.6 10.8 13.1 M10.4 11.2 C6.6 11.4 3.6 9.8 4 8.6 C4.4 7.4 8 8.2 10.4 11.2 M12 10.6 a1.3 1.3 0 1 0 0.1 0",
  },
  swirl: { d: "M2.5 15 C5.5 5.5 10.5 4.8 9.8 11 C9.2 16.4 15.4 17.6 16.4 10.6 C17 6.2 20.4 6.4 21.5 9.4" },
  moon: { d: "M15.4 3.2 C10.2 3.5 6.6 7.8 7 12.8 C7.4 17.6 11.8 21 16.6 20.4 C18.4 20.2 19.9 19.4 21 18.3 C15.8 18.6 12.1 14.6 12.4 9.7 C12.6 7 13.7 4.7 15.4 3.2 Z", fill: true },
  sun: {
    d: "M12 8 a4 4 0 1 0 0.1 0 M12 2.6 L12 5 M12 19 L12 21.4 M2.6 12 L5 12 M19 12 L21.4 12 M5.4 5.4 L7.1 7.1 M16.9 16.9 L18.6 18.6 M5.4 18.6 L7.1 16.9 M16.9 7.1 L18.6 5.4",
  },
  dots: { d: "M5 8 l0.1 0 M10 5 l0.1 0 M15.5 7.5 l0.1 0 M8 13 l0.1 0 M14 13.5 l0.1 0 M19 11 l0.1 0 M11 19 l0.1 0 M17.5 18 l0.1 0" },
};

interface DoodleProps {
  kind: DoodleKind;
  color?: string;
  size?: string;
  rotate?: number;
  style?: CSSProperties;
  className?: string;
}

export function Doodle({ kind, color = "var(--ink-rose)", size = "7cqw", rotate = 0, style, className }: DoodleProps) {
  const { d, fill } = PATHS[kind];
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      style={{ width: size, height: size, transform: `rotate(${rotate}deg)`, overflow: "visible", ...style }}
    >
      <path
        d={d}
        fill={fill ? color : "none"}
        fillOpacity={fill ? 0.18 : 0}
        stroke={color}
        strokeWidth={kind === "dots" ? 2.2 : 1.35}
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#ink-wobble)"
        opacity={0.85}
      />
    </svg>
  );
}

/** Mount once per page tree; defines the filters the doodles and paper use. */
export function InkFilters() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
      <filter id="ink-wobble" x="-10%" y="-10%" width="120%" height="120%">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" />
        <feDisplacementMap in="SourceGraphic" scale="0.9" />
      </filter>
    </svg>
  );
}
