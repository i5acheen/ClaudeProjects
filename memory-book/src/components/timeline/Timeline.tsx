"use client";

import Link from "next/link";
import type { Journal, Memory } from "@/lib/types";
import { ageStamp, isSealed, longDate, monthLabel, shortDate } from "@/lib/dates";
import { sortMemories } from "@/lib/pagination";
import { seededRandom } from "@/lib/random";
import { usePhotoSrc } from "@/components/book/PhotoSource";

/** All memories as little polaroids, grouped by month. Tap one to open the book there. */
export function Timeline({ journal, basePath }: { journal: Journal; basePath: string }) {
  const groups = groupByMonth(sortMemories(journal.memories));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16">
      {groups.length === 0 && (
        <p className="mt-24 text-center font-hand text-3xl text-ink-soft">No memories yet — the first page is waiting.</p>
      )}
      {groups.map(({ label, memories }) => (
        <section key={label} className="mb-10 sm:grid sm:grid-cols-[10rem_1fr] sm:gap-8">
          <div className="mb-4 sm:sticky sm:top-4 sm:mb-0 sm:self-start sm:text-right">
            <h2 className="font-serif text-2xl font-semibold text-ink">{label}</h2>
            <p className="font-serif text-base italic text-ink-soft">
              {ageStamp(journal.settings.dateOfBirth, memories[0].date)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-[repeat(auto-fill,minmax(150px,190px))] sm:border-l sm:border-dashed sm:border-ink-faint/60 sm:pl-8">
            {memories.map((m) => (
              <TimelineCard key={m.id} memory={m} href={`${basePath}?memory=${encodeURIComponent(m.id)}`} />
            ))}
          </div>
        </section>
      ))}
      {groups.length > 0 && (
        <p className="mt-6 text-center font-serif text-lg text-ink-soft">
          <Link href={`${basePath}/export`} className="underline decoration-dotted underline-offset-4 hover:text-ink">
            Download the book as a PDF
          </Link>
        </p>
      )}
    </div>
  );
}

function TimelineCard({ memory, href }: { memory: Memory; href: string }) {
  const thumb = usePhotoSrc(memory.photos[0]?.fileId, "thumb");
  const tilt = seededRandom(memory.id).range(-2, 2);
  const sealed = isSealed(memory.sealedUntil);
  const caption = sealed
    ? `Sealed until ${longDate(memory.sealedUntil!)}`
    : memory.title || memory.text.slice(0, 40) || (memory.kind === "letter" ? "A letter" : "");

  return (
    <Link
      href={href}
      className="group block bg-[#fffdf7] p-2.5 pb-3 shadow-[0_2px_4px_rgba(70,45,20,0.12),0_10px_20px_-10px_rgba(70,45,20,0.35)] transition-transform duration-300 hover:-translate-y-1 hover:rotate-0"
      style={{ transform: `rotate(${tilt}deg)` }}
    >
      <div className="relative aspect-square overflow-hidden bg-[#e8dfd0]">
        {sealed || (memory.kind === "letter" && !thumb) ? (
          <div className="grid h-full place-items-center text-5xl" aria-label={sealed ? "Sealed letter" : "Letter"}>
            {sealed ? "💌" : "✉️"}
          </div>
        ) : thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover saturate-[.92] sepia-[.07]" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center font-hand text-4xl text-ink-faint">✎</div>
        )}
        {!sealed && memory.photos.length > 1 && (
          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/35 px-2 py-0.5 font-serif text-xs text-white">
            +{memory.photos.length - 1}
          </span>
        )}
      </div>
      <p className="mt-2 font-serif text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {shortDate(memory.date)}
      </p>
      <p className={`truncate leading-tight text-ink ${sealed ? "font-serif text-sm italic" : "font-hand text-xl"}`}>{caption}</p>
    </Link>
  );
}

function groupByMonth(memories: Memory[]) {
  const groups: { label: string; memories: Memory[] }[] = [];
  for (const m of memories) {
    const label = monthLabel(m.date);
    const group = groups.at(-1);
    if (group?.label === label) group.memories.push(m);
    else groups.push({ label, memories: [m] });
  }
  return groups;
}
