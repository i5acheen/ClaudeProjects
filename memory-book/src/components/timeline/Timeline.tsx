"use client";

import Link from "next/link";
import { useState } from "react";
import { TAGS, type Journal, type Memory, type Tag } from "@/lib/types";
import { ageStamp, isSealed, longDate, monthLabel, shortDate } from "@/lib/dates";
import { sortMemories } from "@/lib/pagination";
import { seededRandom } from "@/lib/random";
import { usePhotoSrc } from "@/components/book/PhotoSource";
import { GUIDED_TEMPLATES, isGuidedTemplate } from "@/lib/guided";
import { MailIcon, PenIcon } from "@/components/ui/Icons";
import { GuidedIcon } from "@/components/book/GuidedSheet";

type Filter = "all" | "photos" | "letters" | Tag;

/** All memories as little polaroids, grouped by month, with quick filters. Tap one to open the book there. */
export function Timeline({ journal, basePath }: { journal: Journal; basePath: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const all = sortMemories(journal.memories);
  const shown = all.filter((m) =>
    filter === "all"
      ? true
      : filter === "photos"
        ? m.photos.length > 0
        : filter === "letters"
          ? m.kind === "letter"
          : m.tags.includes(filter),
  );
  const groups = groupByMonth(shown);
  const photoCount = all.reduce((n, m) => n + m.photos.length, 0);
  const usedTags = TAGS.filter((tag) => all.some((m) => m.tags.includes(tag)));
  const hasLetters = all.some((m) => m.kind === "letter");
  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "photos", label: "Photos" },
    ...(hasLetters ? [{ id: "letters" as const, label: "Letters" }] : []),
    ...usedTags.map((tag) => ({ id: tag, label: tag })),
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-4 pb-16">
      {all.length > 0 && (
        <header className="timeline-head">
          <div>
            <h1 className="ui-h1">{journal.settings.childName ? `${journal.settings.childName}’s story` : "The story so far"}</h1>
            <p className="mt-1 text-ink-soft">
              {all.length} {all.length === 1 ? "memory" : "memories"} · {photoCount} {photoCount === 1 ? "photo" : "photos"} ·{" "}
              {groups.length > 0 ? ageStamp(journal.settings.dateOfBirth, all.at(-1)!.date) : ""}
            </p>
          </div>
          {filters.length > 2 && (
            <div className="filter-chips" role="group" aria-label="Show">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="filter-chip"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </header>
      )}

      {all.length === 0 && (
        <p className="mt-24 text-center font-hand text-3xl text-ink-soft">No memories yet — the first page is waiting.</p>
      )}
      {all.length > 0 && groups.length === 0 && <p className="mt-12 text-center text-ink-soft">Nothing here yet.</p>}
      {groups.map(({ label, memories }) => (
        <section key={label} className="timeline-month">
          <div className="timeline-month__label">
            <h2>{label}</h2>
            <p>{ageStamp(journal.settings.dateOfBirth, memories[0].date)}</p>
          </div>
          <div className="timeline-month__cards">
            {memories.map((m) => (
              <TimelineCard key={m.id} memory={m} href={`${basePath}?memory=${encodeURIComponent(m.id)}`} />
            ))}
          </div>
        </section>
      ))}
      {groups.length > 0 && (
        <p className="mt-6 text-center text-lg text-ink-soft">
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
        {memory.kind === "guided" && isGuidedTemplate(memory.template) && !thumb ? (
          <div className={`grid h-full place-items-center guided-thumb guided-thumb--${GUIDED_TEMPLATES[memory.template].accent}`} aria-hidden>
            <GuidedIcon template={memory.template} className="size-14" />
          </div>
        ) : sealed || (memory.kind === "letter" && !thumb) ? (
          <div className="grid h-full place-items-center text-5xl" aria-label={sealed ? "Sealed letter" : "Letter"}>
            <MailIcon className="size-12 text-ink-faint" />
          </div>
        ) : thumb ? (
          <img src={thumb} alt="" className="h-full w-full object-cover saturate-[.92] sepia-[.07]" loading="lazy" />
        ) : (
          <div className="grid h-full place-items-center text-ink-faint">
            <PenIcon className="size-10" />
          </div>
        )}
        {!sealed && memory.photos.length > 1 && (
          <span className="absolute right-1.5 bottom-1.5 rounded-full bg-black/35 px-2 py-0.5 text-xs text-white">
            +{memory.photos.length - 1}
          </span>
        )}
      </div>
      <p className="mt-2 text-[0.7rem] font-semibold tracking-[0.14em] text-ink-soft uppercase">
        {shortDate(memory.date)}
      </p>
      <p className={`truncate leading-tight text-ink ${sealed ? "text-sm italic" : "font-hand text-xl"}`}>{caption}</p>
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
