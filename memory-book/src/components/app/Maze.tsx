"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The home page's backdrop: the hand-painted checkerboard of Odd Giraffe's
 * "Maze magic" notebook, square for square. Every other square is painted;
 * butterflies rest on some of the cream ones. Squares behind the page's words
 * (anything marked `data-maze-hole`) stay cream, the way the notebook leaves
 * room for its title.
 */

type Paint = "mint" | "forest" | "blush" | "mustard" | "coral" | "green" | "blue" | "pink" | "peach";
type Square = Paint | "cream" | "butterfly" | "blue-butterfly";

/** The notebook's cover, 6 squares across and 10 down; it repeats to fill the page. */
const NOTEBOOK: Square[][] = [
  ["butterfly", "mint", "cream", "forest", "butterfly", "blush"],
  ["mustard", "cream", "coral", "cream", "green", "blue-butterfly"],
  ["cream", "blue", "butterfly", "pink", "cream", "coral"],
  ["forest", "blue-butterfly", "pink", "cream", "mint", "butterfly"],
  ["butterfly", "coral", "cream", "mustard", "cream", "green"],
  ["mint", "blue-butterfly", "green", "butterfly", "blush", "cream"],
  ["cream", "blue", "cream", "forest", "cream", "pink"],
  ["pink", "cream", "mustard", "cream", "blue", "cream"],
  ["blue-butterfly", "mint", "cream", "forest", "butterfly", "coral"],
  ["mustard", "cream", "peach", "cream", "green", "cream"],
];

/** The pink square on row 7 has a blue butterfly painted over it, as on the cover. */
const PAINTED_OVER = new Set(["6,5"]);

/** About this size on computers; on phones 7 across, so the words sit one square in from each edge. */
const TARGET_SQUARE = 108;
const PHONE_COLUMNS = 7;
const HOLE_PADDING = 10;

interface Layout {
  cols: number;
  rows: number;
  size: number;
  holes: Set<string>;
}

export function Maze({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = root.getBoundingClientRect();
        const cols = box.width < 640 ? PHONE_COLUMNS : Math.max(6, Math.round(box.width / TARGET_SQUARE));
        const size = box.width / cols;
        const rows = Math.ceil(box.height / size);
        const holes = new Set<string>();
        root.querySelectorAll<HTMLElement>("[data-maze-hole]").forEach((el) => {
          const r = el.getBoundingClientRect();
          const top = r.top - box.top - HOLE_PADDING;
          const bottom = r.bottom - box.top + HOLE_PADDING;
          const left = r.left - box.left - HOLE_PADDING;
          const right = r.right - box.left + HOLE_PADDING;
          for (let row = Math.max(0, Math.floor(top / size)); row <= Math.min(rows - 1, Math.floor(bottom / size)); row++)
            for (let col = Math.max(0, Math.floor(left / size)); col <= Math.min(cols - 1, Math.floor(right / size)); col++)
              holes.add(`${row},${col}`);
        });
        setLayout((old) =>
          old && old.cols === cols && old.rows === rows && old.size === size && sameSet(old.holes, holes)
            ? old
            : { cols, rows, size, holes },
        );
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    root.querySelectorAll("[data-maze-hole]").forEach((el) => observer.observe(el));
    measure();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`maze ${className}`}
      style={layout ? ({ "--maze-square": `${layout.size}px` } as React.CSSProperties) : undefined}
    >
      {layout && (
        <div
          className="maze__squares"
          aria-hidden
          style={{ gridTemplateColumns: `repeat(${layout.cols}, ${layout.size}px)`, gridAutoRows: `${layout.size}px` }}
        >
          {Array.from({ length: layout.rows * layout.cols }, (_, i) => {
            const row = Math.floor(i / layout.cols);
            const col = i % layout.cols;
            const square = NOTEBOOK[row % NOTEBOOK.length][col % 6];
            const delay = { animationDelay: `${Math.min(row + col, 24) * 35}ms` };
            if (layout.holes.has(`${row},${col}`)) return <span key={i} />;
            if (square === "cream") return <span key={i} />;
            if (square === "butterfly" || square === "blue-butterfly") {
              return (
                <span key={i} className="maze__butterfly" style={delay}>
                  <Butterfly kind={square === "butterfly" ? "pink" : "blue"} tilt={tilt(row, col)} />
                </span>
              );
            }
            const over = PAINTED_OVER.has(`${row % NOTEBOOK.length},${col % 6}`);
            return (
              <span
                key={i}
                className={`maze__square maze__square--${square}`}
                style={{ ...delay, clipPath: roughEdge(row, col) }}
              >
                {over && <Butterfly kind="blue" tilt={tilt(row, col)} />}
              </span>
            );
          })}
        </div>
      )}
      <div className="maze__content">{children}</div>
    </div>
  );
}

function sameSet(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

/** A small, repeatable wobble for each square (no two alike, the same on every visit). */
function noise(row: number, col: number, n: number) {
  const x = Math.sin(row * 127.1 + col * 311.7 + n * 74.7) * 43758.5453;
  return x - Math.floor(x);
}

/** Slightly uneven edges, like squares painted with a brush. */
function roughEdge(row: number, col: number) {
  const j = (n: number) => (noise(row, col, n) * 2.2).toFixed(2);
  return `polygon(${j(1)}% ${j(2)}%, 50% ${j(3)}%, ${100 - +j(4)}% ${j(5)}%, ${100 - +j(6)}% 50%, ${100 - +j(7)}% ${100 - +j(8)}%, 50% ${100 - +j(9)}%, ${j(10)}% ${100 - +j(11)}%, ${j(12)}% 50%)`;
}

const tilt = (row: number, col: number) => Math.round((noise(row, col, 20) - 0.5) * 40);

/** The notebook's two butterflies: pink with orange lower wings, and blue. */
function Butterfly({ kind, tilt }: { kind: "pink" | "blue"; tilt: number }) {
  const [upper, lower, spot, body] =
    kind === "pink" ? ["#e98fb0", "#f2a24e", "#4d63b8", "#2f3a7a"] : ["#5b70d0", "#3f4fa8", "#9a63c4", "#262c66"];
  return (
    <svg viewBox="0 0 40 40" className="maze__butterfly-svg" style={{ transform: `rotate(${tilt}deg)` }}>
      <path d="M20 18C14 6 4 6 5 15c1 6 9 6 15 4z" fill={upper} />
      <path d="M20 18c6-12 16-12 15-3-1 6-9 6-15 4z" fill={upper} />
      <path d="M20 20c-7 1-12 6-9 11 3 4 8-2 9-10z" fill={lower} />
      <path d="M20 20c7 1 12 6 9 11-3 4-8-2-9-10z" fill={lower} />
      <circle cx="10" cy="13" r="1.8" fill={spot} opacity=".8" />
      <circle cx="30" cy="13" r="1.8" fill={spot} opacity=".8" />
      <circle cx="13.5" cy="27" r="1.3" fill="#fff4e0" opacity=".85" />
      <circle cx="26.5" cy="27" r="1.3" fill="#fff4e0" opacity=".85" />
      <ellipse cx="20" cy="21" rx="1.5" ry="8" fill={body} />
      <path d="M19.4 13.5c-1-3-2.5-5-4.5-6M20.6 13.5c1-3 2.5-5 4.5-6" stroke={body} strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </svg>
  );
}
