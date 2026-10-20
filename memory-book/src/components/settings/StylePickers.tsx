"use client";

import type { BookSettings } from "@/lib/types";
import {
  COVER_COLORS,
  COVER_THEMES,
  HANDWRITING,
  PAPER_COLORS,
  PAPER_FRAMES,
  PAPER_PATTERNS,
  paperVars,
  type CoverColor,
  type CoverTheme,
  type Handwriting,
  type Paper,
  type PaperColor,
  type PaperFrame,
  type PaperPattern,
} from "@/lib/book-style";
import { CoverPage } from "@/components/book/BookPages";

/** Pick a cover style (shown as little covers), its colour, the paper, and a writing style (shown as samples). */
export function StylePickers({
  preview,
  theme,
  onTheme,
  color,
  onColor,
  paper,
  onPaper,
  hand,
  onHand,
}: {
  /** Used to draw the cover previews with the real title, name and photo. */
  preview: BookSettings;
  theme: CoverTheme;
  onTheme: (theme: CoverTheme) => void;
  color: CoverColor | undefined;
  onColor: (color: CoverColor | undefined) => void;
  paper: Paper;
  onPaper: (paper: Paper) => void;
  hand: Handwriting;
  onHand: (hand: Handwriting) => void;
}) {
  return (
    <>
      <p className="field-label mt-6">Cover style</p>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pt-1 pb-3">
        {(Object.keys(COVER_THEMES) as CoverTheme[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => onTheme(id)}
            aria-pressed={theme === id}
            className="cover-option shrink-0"
            title={COVER_THEMES[id].label}
          >
            <span className="block aspect-[3/4] w-24 overflow-hidden rounded-sm [container-type:size]">
              <CoverPage settings={{ ...preview, coverTheme: id, coverColor: color }} />
            </span>
            <span className="mt-1.5 block text-center text-sm text-ink-soft">{COVER_THEMES[id].label}</span>
          </button>
        ))}
      </div>
      {theme === "photo" && !preview.coverPhoto && (
        <p className="text-sm text-ink-faint italic">Add a cover photo to see this style — it fills the whole cover.</p>
      )}

      <p className="field-label mt-5">Cover colour</p>
      <CoverColorSwatches value={color} onChange={onColor} />

      <p className="field-label mt-6">Paper</p>
      <p className="mb-3 text-sm text-ink-soft">
        A colour and a pattern for every page. Any page can have its own: tap ✎ in the journal, then <i>Page style</i>.
      </p>
      <PaperPicker value={paper} onChange={(p) => p && onPaper(p)} />

      <p className="field-label mt-6">Writing style</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(HANDWRITING) as Handwriting[]).map((id) => (
          <button key={id} type="button" onClick={() => onHand(id)} aria-pressed={hand === id} className="font-option">
            <span
              className="block truncate leading-tight text-ink"
              style={{ fontFamily: HANDWRITING[id].family, fontSize: `${1.6 * HANDWRITING[id].scale}rem` }}
            >
              Dear {preview.childName || "little one"}, today…
            </span>
            <span className="mt-0.5 block text-xs tracking-wide text-ink-faint uppercase">
              {HANDWRITING[id].label} · {HANDWRITING[id].sample}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/** Round cloth swatches, like a photobook's colour choices. The first keeps the cover style's own colour. */
export function CoverColorSwatches({
  value,
  onChange,
}: {
  value: CoverColor | undefined;
  onChange: (color: CoverColor | undefined) => void;
}) {
  return (
    <div className="swatches" role="radiogroup" aria-label="Cover colour">
      <button
        type="button"
        role="radio"
        aria-checked={!value}
        className="swatch swatch--auto"
        onClick={() => onChange(undefined)}
        title="The style's own colour"
      >
        <span className="sr-only">The style&rsquo;s own colour</span>
      </button>
      {(Object.keys(COVER_COLORS) as CoverColor[]).map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          className="swatch"
          style={{ background: COVER_COLORS[id].hex }}
          onClick={() => onChange(id)}
          title={COVER_COLORS[id].label}
        >
          <span className="sr-only">{COVER_COLORS[id].label}</span>
        </button>
      ))}
      <span className="swatches__name" aria-hidden>
        {value ? COVER_COLORS[value].label : "Style’s own"}
      </span>
    </div>
  );
}

/**
 * Paper: a row of colours, then the patterns shown on that colour. With
 * `bookPaper` (for one page), "Same as the book" comes first and leaves the
 * page to follow the book.
 */
export function PaperPicker({
  value,
  onChange,
  bookPaper,
}: {
  value: Paper | undefined;
  onChange: (paper: Paper | undefined) => void;
  bookPaper?: Paper;
}) {
  const shown = value ?? bookPaper ?? { color: "cream" as PaperColor, pattern: "plain" as PaperPattern };
  return (
    <div className="paper-picker">
      {bookPaper && (
        <label className="paper-follow">
          <input
            type="checkbox"
            checked={!value}
            onChange={(e) => onChange(e.target.checked ? undefined : { ...bookPaper })}
            className="size-4 accent-[var(--accent)]"
          />
          Same as the rest of the book
        </label>
      )}
      <p className="paper-picker__label">Colour</p>
      <div className="swatches" role="radiogroup" aria-label="Paper colour">
        {(Object.keys(PAPER_COLORS) as PaperColor[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={!!value && value.color === id}
            className="swatch swatch--paper"
            style={{ background: PAPER_COLORS[id].paper }}
            onClick={() => onChange({ ...shown, color: id })}
            title={PAPER_COLORS[id].label}
          >
            <span className="sr-only">{PAPER_COLORS[id].label}</span>
          </button>
        ))}
        <span className="swatches__name" aria-hidden>
          {PAPER_COLORS[shown.color].label}
        </span>
      </div>
      <p className="paper-picker__label">Frame</p>
      <div className="swatches" role="radiogroup" aria-label="Page frame">
        {(Object.keys(PAPER_FRAMES) as PaperFrame[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={!!value && (value.frame ?? "none") === id}
            className={`swatch ${id === "none" ? "swatch--frame-none" : ""}`}
            style={id === "none" ? undefined : { background: PAPER_FRAMES[id].color }}
            onClick={() => onChange({ ...shown, frame: id === "none" ? undefined : id })}
            title={PAPER_FRAMES[id].label}
          >
            <span className="sr-only">{PAPER_FRAMES[id].label}</span>
          </button>
        ))}
        <span className="swatches__name" aria-hidden>
          {PAPER_FRAMES[shown.frame ?? "none"].label}
        </span>
      </div>
      <p className="paper-picker__label">Pattern</p>
      <div className="paper-options" role="radiogroup" aria-label="Paper pattern">
        {(Object.keys(PAPER_PATTERNS) as PaperPattern[]).map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={!!value && value.pattern === id}
            className="paper-option"
            onClick={() => onChange({ ...shown, pattern: id })}
          >
            <span className="paper-option__sheet" style={paperVars({ ...shown, pattern: id }) as React.CSSProperties} />
            <span className="paper-option__label">{PAPER_PATTERNS[id].label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
