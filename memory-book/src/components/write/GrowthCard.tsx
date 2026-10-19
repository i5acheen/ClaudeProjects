"use client";

import { useEffect, useState } from "react";
import type { Journal } from "@/lib/types";
import { monthOfAgeRange, monthsOld, shortDate, todayString } from "@/lib/dates";
import { useJournal } from "@/components/journal/JournalProvider";

const monthName = (months: number) => (months === 0 ? "First month" : `${months} month${months === 1 ? "" : "s"}`);

/**
 * Height and weight for each month of age. They're printed on the month's
 * divider page in the book.
 */
export function GrowthCard({ journal }: { journal: Journal }) {
  const { updateGrowth } = useJournal();
  const { dateOfBirth } = journal.settings;
  const current = Math.max(0, monthsOld(dateOfBirth, todayString()));
  const [months, setMonths] = useState(current);
  const saved = journal.growth?.[String(months)];
  const [height, setHeight] = useState(saved?.height ?? "");
  const [weight, setWeight] = useState(saved?.weight ?? "");
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setHeight(saved?.height ?? "");
    setWeight(saved?.weight ?? "");
    setStatus(null);
    // Only when switching months — not while typing.
  }, [months]);

  async function save() {
    setStatus("Saving…");
    try {
      await updateGrowth(months, { height, weight });
      setStatus("Saved — it's on the month's page in the book.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  const range = monthOfAgeRange(dateOfBirth, months);
  return (
    <section className="sheet" aria-labelledby="growth-heading">
      <h2 id="growth-heading" className="ui-h2">
        Growing up
      </h2>
      <p className="text-ink-soft">Height and weight for each month, printed on the month&rsquo;s divider page.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-ink-soft">
          Month
          <select className="text-field mt-1 block !w-auto !text-base" value={months} onChange={(e) => setMonths(Number(e.target.value))}>
            {Array.from({ length: current + 1 }, (_, i) => current - i).map((m) => (
              <option key={m} value={m}>
                {monthName(m)}
                {journal.growth?.[String(m)] ? " ✓" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-ink-soft">
          Height
          <input className="text-field mt-1 block !w-28 !text-base" placeholder="62 cm" value={height} maxLength={20} onChange={(e) => setHeight(e.target.value)} />
        </label>
        <label className="text-sm text-ink-soft">
          Weight
          <input className="text-field mt-1 block !w-28 !text-base" placeholder="6.2 kg" value={weight} maxLength={20} onChange={(e) => setWeight(e.target.value)} />
        </label>
        <button type="button" className="chrome-button chrome-button--primary !h-11 !px-5" onClick={save} disabled={status === "Saving…"}>
          Save
        </button>
      </div>
      <p className="mt-2 text-xs tracking-[0.12em] text-ink-faint uppercase">
        {shortDate(range.from)} – {shortDate(range.to)}
      </p>
      {status && <p className="mt-1 text-sm text-ink-soft">{status}</p>}
    </section>
  );
}
