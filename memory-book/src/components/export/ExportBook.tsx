"use client";

import { useEffect, useMemo, useState } from "react";
import type { Journal } from "@/lib/types";
import { paginate, type BookPage } from "@/lib/pagination";
import { PRINT_FORMATS, SCREEN_FORMAT, type PageFormat } from "@/lib/page-format";
import { parseDay, shortDate, toDayString } from "@/lib/dates";
import { BookPageView } from "@/components/book/BookPages";
import { InkFilters } from "@/components/book/Doodles";
import { PageFormatProvider } from "@/components/book/PageFormatContext";

/**
 * Print-ready PDF export. The pages are drawn at their exact printed size
 * and the browser's own "Save as PDF" turns them into a PDF — so text stays
 * crisp and every paper, tape and polaroid detail is kept.
 */

type RangeKind = "all" | "life-year" | "calendar-year" | "custom";

interface Range {
  from: string;
  to: string;
  label: string;
}

function addYears(iso: string, years: number): string {
  const d = parseDay(iso);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toDayString(d);
}

function dayBefore(iso: string): string {
  return toDayString(new Date(parseDay(iso).getTime() - 86_400_000));
}

const ordinalWord = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth"];

export function ExportBook({ journal }: { journal: Journal }) {
  const { settings, memories } = journal;
  const dates = memories.map((m) => m.date).sort();
  const firstDate = dates[0] ?? settings.dateOfBirth;
  const lastDate = dates.at(-1) ?? settings.dateOfBirth;

  // "Her first year" etc., from birthday to birthday.
  const lifeYears = useMemo<Range[]>(() => {
    const years: Range[] = [];
    for (let i = 0; i < 25; i++) {
      const from = addYears(settings.dateOfBirth, i);
      if (from > lastDate) break;
      const to = dayBefore(addYears(settings.dateOfBirth, i + 1));
      years.push({ from, to, label: `${settings.childName}'s ${ordinalWord[i] ?? `${i + 1}th`} year (${shortDate(from)} – ${shortDate(to)})` });
    }
    return years;
  }, [settings.dateOfBirth, settings.childName, lastDate]);

  const calendarYears = useMemo(
    () => [...new Set(dates.map((d) => d.slice(0, 4)))].map((y) => ({ from: `${y}-01-01`, to: `${y}-12-31`, label: y })),
    [dates],
  );

  const [rangeKind, setRangeKind] = useState<RangeKind>("all");
  const [lifeYear, setLifeYear] = useState(0);
  const [calendarYear, setCalendarYear] = useState(0);
  const [customFrom, setCustomFrom] = useState(firstDate);
  const [customTo, setCustomTo] = useState(lastDate);
  const [formatId, setFormatId] = useState<PageFormat["id"]>("a4");
  const [includeCovers, setIncludeCovers] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [loaded, setLoaded] = useState({ done: 0, total: 0 });

  const format = PRINT_FORMATS.find((f) => f.id === formatId)!;
  // A square page is too short for the 3:4 layout, so inner pages keep their
  // shape as a centred column with wide margins, like a real square photo book.
  const inset = format.heightCqw < SCREEN_FORMAT.heightCqw;
  const layoutFormat = inset ? SCREEN_FORMAT : format;
  const range: Range | null =
    rangeKind === "life-year"
      ? (lifeYears[lifeYear] ?? null)
      : rangeKind === "calendar-year"
        ? (calendarYears[calendarYear] ?? null)
        : rangeKind === "custom"
          ? { from: customFrom, to: customTo, label: "" }
          : null;

  const pages = useMemo(() => {
    const chosen = range ? memories.filter((m) => m.date >= range.from && m.date <= range.to) : memories;
    const all = paginate({ ...journal, memories: chosen }, layoutFormat);
    return includeCovers ? all : all.filter((p) => p.kind !== "cover" && p.kind !== "back" && p.kind !== "endpaper");
  }, [journal, memories, range, layoutFormat, includeCovers]);
  const memoryCount = new Set(pages.flatMap((p) => (p.kind === "memory" ? [p.memory.id] : []))).size;

  // Wait until every photo has loaded before opening the print window.
  const expectedPhotos = expectedImageCount(pages, includeCovers && !!settings.coverPhoto);
  useEffect(() => {
    if (!preparing) return;
    let cancelled = false;
    const poll = async () => {
      await document.fonts.ready;
      while (!cancelled) {
        const images = Array.from(document.querySelectorAll<HTMLImageElement>(".print-pages img"));
        const done = images.filter((img) => img.complete && img.naturalWidth > 0).length;
        setLoaded({ done, total: expectedPhotos });
        if (done >= expectedPhotos) break;
        await new Promise((r) => setTimeout(r, 300));
      }
      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 300));
      setPreparing(false);
      window.print();
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [preparing, expectedPhotos]);

  const printSize = format.print!;

  return (
    <PageFormatProvider value={layoutFormat}>
      <InkFilters />
      <style>{`@page { size: ${printSize.width} ${printSize.height}; margin: 0; }`}</style>

      <div className="no-print mx-auto max-w-xl px-3 sm:px-4">
        <div className="sheet">
          <h1 className="font-hand text-4xl font-bold text-ink">Download as a PDF</h1>
          <p className="mt-2 font-serif text-lg text-ink-soft">A print-ready copy of the book, to keep or to have printed.</p>

          <p className="field-label mt-6">Which memories?</p>
          <div className="space-y-2.5 font-serif text-lg text-ink">
            <Choice checked={rangeKind === "all"} onChange={() => setRangeKind("all")}>
              The whole book
            </Choice>
            {lifeYears.length > 0 && (
              <Choice checked={rangeKind === "life-year"} onChange={() => setRangeKind("life-year")}>
                One year of {settings.childName ? `${settings.childName}’s` : "her"} life
                {rangeKind === "life-year" && (
                  <select className="text-field mt-1 !text-base" value={lifeYear} onChange={(e) => setLifeYear(Number(e.target.value))}>
                    {lifeYears.map((y, i) => (
                      <option key={y.from} value={i}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                )}
              </Choice>
            )}
            {calendarYears.length > 1 && (
              <Choice checked={rangeKind === "calendar-year"} onChange={() => setRangeKind("calendar-year")}>
                A calendar year
                {rangeKind === "calendar-year" && (
                  <select className="text-field mt-1 !text-base" value={calendarYear} onChange={(e) => setCalendarYear(Number(e.target.value))}>
                    {calendarYears.map((y, i) => (
                      <option key={y.label} value={i}>
                        {y.label}
                      </option>
                    ))}
                  </select>
                )}
              </Choice>
            )}
            <Choice checked={rangeKind === "custom"} onChange={() => setRangeKind("custom")}>
              Between two dates
              {rangeKind === "custom" && (
                <span className="mt-1 flex flex-wrap items-center gap-3">
                  <input type="date" className="text-field !w-auto !text-base" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                  <span className="text-ink-soft">to</span>
                  <input type="date" className="text-field !w-auto !text-base" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
                </span>
              )}
            </Choice>
          </div>

          <p className="field-label mt-6">Page size</p>
          <div className="space-y-2.5 font-serif text-lg text-ink">
            {PRINT_FORMATS.map((f) => (
              <Choice key={f.id} checked={formatId === f.id} onChange={() => setFormatId(f.id)}>
                {f.label}
              </Choice>
            ))}
          </div>

          <label className="mt-6 flex items-center gap-3 font-serif text-lg text-ink">
            <input type="checkbox" className="size-5 accent-[var(--accent)]" checked={includeCovers} onChange={(e) => setIncludeCovers(e.target.checked)} />
            Include the covers and patterned endpapers
          </label>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              type="button"
              className="chrome-button chrome-button--primary !h-12 !px-6 !text-lg"
              disabled={preparing || memoryCount === 0}
              onClick={() => setPreparing(true)}
            >
              {preparing ? `Preparing photos… ${loaded.done} of ${loaded.total}` : "Save as PDF"}
            </button>
            <span className="font-serif text-ink-soft">
              {memoryCount} {memoryCount === 1 ? "memory" : "memories"} · {pages.length} pages
            </span>
          </div>

          <details className="mt-6 font-serif text-base text-ink-soft">
            <summary className="cursor-pointer text-ink">How to save the PDF</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>A print window opens. As the printer, choose <b>Save as PDF</b> (on iPhone: tap Share → Save to Files).</li>
              <li>
                Make sure <b>Margins</b> is set to <b>None</b> and <b>Background graphics</b> is on, if your browser shows those
                options.
              </li>
              <li>Save — that file is ready to print at home or send to a photo-book printer.</li>
            </ol>
          </details>
        </div>

        <h2 className="mt-10 mb-4 text-center font-hand text-3xl text-ink-soft">Preview</h2>
      </div>

      <div
        className="print-pages mx-auto grid max-w-5xl grid-cols-2 gap-4 px-3 pb-20 sm:grid-cols-3 sm:gap-6 sm:px-4"
        style={{ "--print-width": printSize.width, "--print-height": printSize.height } as React.CSSProperties}
      >
        {pages.map((page, i) => (
          <div key={i} className="print-page" style={{ aspectRatio: `100 / ${format.heightCqw}` }}>
            {inset && !FULL_BLEED.has(page.kind) ? (
              <div className="print-page__column">
                <BookPageView page={page} index={includeCovers ? i : i + 2} settings={settings} growth={journal.growth} />
              </div>
            ) : (
              <BookPageView page={page} index={includeCovers ? i : i + 2} settings={settings} growth={journal.growth} />
            )}
          </div>
        ))}
      </div>
    </PageFormatProvider>
  );
}

/** Pages that always fill the whole sheet. */
const FULL_BLEED = new Set<BookPage["kind"]>(["cover", "back", "endpaper"]);

function Choice({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="radio" className="mt-1.5 size-4 accent-[var(--accent)]" checked={checked} onChange={onChange} />
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
    </label>
  );
}

function expectedImageCount(pages: BookPage[], coverPhoto: boolean): number {
  let count = coverPhoto ? 1 : 0;
  for (const page of pages) {
    if (page.kind === "memory" && !page.continued) count += Math.min(page.memory.photos.length, 4);
  }
  return count;
}
