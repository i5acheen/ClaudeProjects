"use client";

import type { BookSettings } from "@/lib/types";
import { COVER_THEMES, HANDWRITING, type CoverTheme, type Handwriting } from "@/lib/book-style";
import { CoverPage } from "@/components/book/BookPages";

/** Pick a cover style (shown as little covers) and a writing style (shown as samples). */
export function StylePickers({
  preview,
  theme,
  onTheme,
  hand,
  onHand,
}: {
  /** Used to draw the cover previews with the real title, name and photo. */
  preview: BookSettings;
  theme: CoverTheme;
  onTheme: (theme: CoverTheme) => void;
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
              <CoverPage settings={{ ...preview, coverTheme: id }} />
            </span>
            <span className="mt-1.5 block text-center font-serif text-sm text-ink-soft">{COVER_THEMES[id].label}</span>
          </button>
        ))}
      </div>
      {theme === "photo" && !preview.coverPhoto && (
        <p className="font-serif text-sm text-ink-faint italic">Add a cover photo to see this style — it fills the whole cover.</p>
      )}

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
            <span className="mt-0.5 block font-serif text-xs tracking-wide text-ink-faint uppercase">
              {HANDWRITING[id].label} · {HANDWRITING[id].sample}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
