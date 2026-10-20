"use client";

import type { BookSettings } from "@/lib/types";
import {
  COVER_COLORS,
  COVER_THEMES,
  HANDWRITING,
  PAGE_STYLES,
  pageStyleVars,
  type CoverColor,
  type CoverTheme,
  type Handwriting,
  type PageStyle,
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
  paper: PageStyle;
  onPaper: (paper: PageStyle) => void;
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
      <p className="mb-2 text-sm text-ink-soft">For every page. You can give any page its own paper when you write it.</p>
      <PaperPicker value={paper} onChange={(p) => onPaper(p ?? "cream")} />

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
 * Little sheets of each paper. With `bookPaper`, the first choice is "same as
 * the book" (for one page); otherwise every choice is a paper.
 */
export function PaperPicker({
  value,
  onChange,
  bookPaper,
}: {
  value: PageStyle | undefined;
  onChange: (paper: PageStyle | undefined) => void;
  bookPaper?: PageStyle;
}) {
  const option = (id: PageStyle | undefined, label: string, shown: PageStyle) => (
    <button
      key={id ?? "book"}
      type="button"
      role="radio"
      aria-checked={value === id}
      className="paper-option"
      onClick={() => onChange(id)}
    >
      <span className="paper-option__sheet" style={pageStyleVars(shown) as React.CSSProperties} />
      <span className="paper-option__label">{label}</span>
    </button>
  );
  return (
    <div className="paper-options" role="radiogroup" aria-label="Paper">
      {bookPaper && option(undefined, "Book’s paper", bookPaper)}
      {(Object.keys(PAGE_STYLES) as PageStyle[]).map((id) => option(id, PAGE_STYLES[id].label, id))}
    </div>
  );
}
