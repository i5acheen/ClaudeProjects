"use client";

import { useEffect, useState } from "react";
import type { Journal } from "@/lib/types";
import { monthPageTitle } from "@/lib/dates";
import { useJournal } from "@/components/journal/JournalProvider";
import { MonthPage } from "./BookPages";

/**
 * Edit a month divider page from the journal: its heading, a short line,
 * height and weight — or turn month pages off for the whole book.
 */
export function MonthSheet({ journal, months, onClose }: { journal: Journal; months: number; onClose: () => void }) {
  const { updateGrowth, updateSettings, access } = useJournal();
  const saved = journal.growth?.[String(months)];
  const [title, setTitle] = useState(saved?.title ?? "");
  const [note, setNote] = useState(saved?.note ?? "");
  const [height, setHeight] = useState(saved?.height ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function run(label: string, action: () => Promise<void>) {
    setError(null);
    setStatus(label);
    try {
      await action();
      onClose();
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  const save = () => run("Saving…", () => updateGrowth(months, { title, note, height, weight }));
  const turnOff = () => run("Removing…", () => updateSettings({ ...journal.settings, monthPages: false }));

  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label="Edit the month page" onClick={onClose}>
      <div className="note-sheet" onClick={(e) => e.stopPropagation()}>
        <h2 className="ui-h2">Month page</h2>

        <div className="mt-4 flex flex-col gap-5 sm:flex-row">
          <div className="mx-auto aspect-[3/4] w-40 shrink-0 overflow-hidden rounded-sm shadow-md [container-type:size] sm:mx-0">
            <MonthPage months={months} settings={journal.settings} growth={{ title, note, height, weight }} />
          </div>
          <div className="min-w-0 flex-1">
            <label className="field-label" htmlFor="month-title">
              Heading
            </label>
            <input id="month-title" className="text-field hand-field" value={title} maxLength={40} placeholder={monthPageTitle(months)} onChange={(e) => setTitle(e.target.value)} />

            <label className="field-label mt-4" htmlFor="month-note">
              A line about this month <span className="normal-case tracking-normal italic">(optional)</span>
            </label>
            <input id="month-note" className="text-field hand-field" value={note} maxLength={120} placeholder="The month you found your feet" onChange={(e) => setNote(e.target.value)} />

            <div className="mt-4 flex gap-3">
              <label className="text-sm text-ink-soft">
                Height
                <input className="text-field mt-1 block !w-28 !text-base" placeholder="62 cm" value={height} maxLength={20} onChange={(e) => setHeight(e.target.value)} />
              </label>
              <label className="text-sm text-ink-soft">
                Weight
                <input className="text-field mt-1 block !w-28 !text-base" placeholder="6.2 kg" value={weight} maxLength={20} onChange={(e) => setWeight(e.target.value)} />
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null}>
            {status ?? "Save page"}
          </button>
          <button type="button" className="chrome-button" onClick={onClose}>
            Cancel
          </button>
        </div>

        {access.isOwner && (
        <div className="mt-6 border-t border-dashed border-ink-faint/50 pt-4 text-sm text-ink-soft">
          Prefer the book without month pages?{" "}
          <button type="button" className="text-ink underline decoration-dotted underline-offset-4" onClick={turnOff} disabled={status !== null}>
            Remove all month pages
          </button>
          <span className="block text-ink-faint">Your notes stay saved — you can turn them back on in Settings.</span>
        </div>
        )}
        {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
      </div>
    </div>
  );
}
