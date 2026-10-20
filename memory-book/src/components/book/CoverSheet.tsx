"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { BookSettings } from "@/lib/types";
import { coverColor, coverTheme, type CoverColor } from "@/lib/book-style";
import { CoverColorSwatches } from "@/components/settings/StylePickers";
import { shortDate } from "@/lib/dates";
import { useJournal } from "@/components/journal/JournalProvider";
import { CoverPage } from "./BookPages";
import { usePhotoSrc } from "./PhotoSource";
import { APP_NAME } from "@/content/marketing";

/**
 * Edit the cover in place: its title and the line under it, its colour, which part of
 * the photo stays in view, and where the title label sits.
 */
export function CoverSheet({
  settings,
  onClose,
  onSaved,
}: {
  settings: BookSettings;
  onClose: () => void;
  onSaved?: (settings: BookSettings) => void;
}) {
  const { updateSettings } = useJournal();
  const [title, setTitle] = useState(settings.bookTitle);
  const [subtitle, setSubtitle] = useState(settings.coverSubtitle ?? "");
  const [focus, setFocus] = useState(settings.coverFocus ?? { x: 50, y: 50 });
  const [color, setColor] = useState<CoverColor | undefined>(coverColor(settings));
  const [label, setLabel] = useState<"top" | "bottom">(settings.coverLabel ?? "bottom");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photoSrc = usePhotoSrc(settings.coverPhoto?.fileId);
  const picker = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const theme = coverTheme(settings);

  const draft: BookSettings = {
    ...settings,
    bookTitle: title.trim() || APP_NAME,
    coverSubtitle: subtitle.trim() || undefined,
    coverFocus: focus,
    coverLabel: label,
    coverColor: color,
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function pick(e: React.PointerEvent) {
    const box = picker.current?.getBoundingClientRect();
    if (!box) return;
    const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));
    setFocus({ x: clamp(((e.clientX - box.left) / box.width) * 100), y: clamp(((e.clientY - box.top) / box.height) * 100) });
  }

  async function save() {
    setError(null);
    setStatus("Saving…");
    try {
      await updateSettings(draft);
      onSaved?.(draft);
      onClose();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't save the cover.");
    }
  }

  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label="Edit the cover" onClick={onClose}>
      <div className="note-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="ui-h2">Edit the cover</h2>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          <div className="mx-auto aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-sm shadow-md [container-type:size] sm:mx-0">
            <CoverPage settings={draft} />
          </div>

          <div className="min-w-0 flex-1">
            <label className="field-label" htmlFor="cover-title">
              Title
            </label>
            <input id="cover-title" className="text-field" value={title} maxLength={40} onChange={(e) => setTitle(e.target.value)} />

            <label className="field-label mt-4" htmlFor="cover-subtitle">
              Line under the title
            </label>
            <input
              id="cover-subtitle"
              className="text-field"
              value={subtitle}
              maxLength={60}
              placeholder={`for ${settings.childName} · ${shortDate(settings.dateOfBirth)}`}
              onChange={(e) => setSubtitle(e.target.value)}
            />

            <p className="field-label mt-4">Colour</p>
            <CoverColorSwatches value={color} onChange={setColor} />

            {theme === "photo" && settings.coverPhoto && (
              <>
                <p className="field-label mt-4">Title label</p>
                <div className="flex gap-2">
                  {(["top", "bottom"] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      aria-pressed={label === pos}
                      className={`chrome-button field-button !h-9 !px-4 !text-sm ${label === pos ? "!border-[var(--accent)] !bg-[var(--accent-soft)]" : ""}`}
                      onClick={() => setLabel(pos)}
                    >
                      {pos === "top" ? "At the top" : "At the bottom"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {settings.coverPhoto ? (
          <div className="mt-5">
            <p className="field-label">Keep in view</p>
            <p className="mb-2 text-sm text-ink-soft">Tap the part of the photo that matters most — like a face.</p>
            <div
              ref={picker}
              className="focus-picker"
              aria-label="Cover photo: tap to choose what stays in view"
              onPointerDown={(e) => {
                dragging.current = true;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                pick(e);
              }}
              onPointerMove={(e) => dragging.current && pick(e)}
              onPointerUp={() => (dragging.current = false)}
            >
              {photoSrc && <img src={photoSrc} alt="" draggable={false} />}
              <span className="focus-picker__dot" style={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
            </div>
          </div>
        ) : (
          <p className="mt-5 text-sm text-ink-soft">
            No cover photo yet —{" "}
            <Link href="/book/settings" className="underline decoration-dotted underline-offset-4">
              choose one in Settings
            </Link>
            .
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null}>
            {status ?? "Save cover"}
          </button>
          <button type="button" className="chrome-button" onClick={onClose}>
            Cancel
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
      </div>
    </div>
  );
}
