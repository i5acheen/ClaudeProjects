"use client";

import type { BookSettings, Memory, Tag } from "@/lib/types";
import { pageNumber, type BookPage } from "@/lib/pagination";
import { ageStamp, longDate } from "@/lib/dates";
import { CONTENT_WIDTH, layoutMemory } from "@/lib/layout";
import { Doodle } from "./Doodles";
import { PhotoFrame, WashiTape } from "./PhotoFrame";
import { usePhotoSrc } from "./PhotoSource";
import { useFitText } from "./useFitText";
import { usePageFormat } from "./PageFormatContext";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const TAG_ICON: Record<Tag, string> = {
  First: "✦",
  Milestone: "★",
  Festival: "✿",
  Family: "♥",
  Funny: "☺",
};

function TagStamp({ tag, rotate }: { tag: Tag; rotate: number }) {
  return (
    <span className={`tag-stamp tag-stamp--${tag.toLowerCase()}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <span aria-hidden>{TAG_ICON[tag]}</span> {tag}
    </span>
  );
}

function PageNumber({ n }: { n: number }) {
  return <div className="page-number">{n}</div>;
}

/** A short hand-drawn underline for titles. */
function Squiggle({ color = "var(--ink-rose)" }: { color?: string }) {
  return (
    <svg viewBox="0 0 120 8" className="title-squiggle" aria-hidden preserveAspectRatio="none">
      <path
        d="M2 5 C 15 2, 25 7, 40 4.5 S 65 2.5, 80 5 S 105 6.5, 118 3"
        fill="none"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        filter="url(#ink-wobble)"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Covers                                                              */
/* ------------------------------------------------------------------ */

export function CoverPage({ settings }: { settings: BookSettings }) {
  const coverSrc = usePhotoSrc(settings.coverPhoto?.fileId);
  return (
    <div className="cover">
      <div className="cover__frame">
        <p className="cover__eyebrow">a book of memories</p>
        <h1 className="cover__title">{settings.bookTitle}</h1>
        <div className="cover__window">
          {coverSrc ? <img src={coverSrc} alt="" draggable={false} /> : <Doodle kind="heart" color="var(--foil)" size="20cqw" />}
        </div>
        <p className="cover__name">for {settings.childName}</p>
        <p className="cover__born">born {longDate(settings.dateOfBirth)}</p>
        <div className="cover__stars" aria-hidden>
          <Doodle kind="sparkle" color="var(--foil)" size="5cqw" rotate={-8} />
          <Doodle kind="star" color="var(--foil)" size="4cqw" rotate={12} />
          <Doodle kind="sparkle" color="var(--foil)" size="5cqw" rotate={6} />
        </div>
      </div>
    </div>
  );
}

export function BackCoverPage({ settings }: { settings: BookSettings }) {
  return (
    <div className="cover cover--back">
      <div className="back__emblem">
        <Doodle kind="heart" color="var(--foil)" size="11cqw" />
        <p>made with love for {settings.childName}</p>
      </div>
    </div>
  );
}

export function EndpaperPage({ side, settings }: { side: "front" | "back"; settings: BookSettings }) {
  return (
    <div className="endpaper">
      {side === "front" && (
        <div className="bookplate">
          <p className="bookplate__label">this book belongs to</p>
          <p className="bookplate__name">{settings.childName}</p>
          <Doodle kind="heart" color="var(--ink-rose)" size="6cqw" />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Title page                                                          */
/* ------------------------------------------------------------------ */

export function TitlePage({ settings }: { settings: BookSettings }) {
  return (
    <div className="paper title-page">
      <Doodle kind="sun" color="var(--ink-honey)" size="9cqw" rotate={-6} style={{ position: "absolute", top: "9cqw", right: "10cqw" }} />
      <div className="title-page__body">
        <p className="title-page__eyebrow">the story of</p>
        <h2 className="title-page__name">{settings.childName}</h2>
        <Squiggle />
        <p className="title-page__born">
          born on {longDate(settings.dateOfBirth)}
        </p>
        <p className="title-page__book">{settings.bookTitle}</p>
      </div>
      {settings.dedication && <p className="title-page__dedication">{settings.dedication}</p>}
      <Doodle kind="flower" color="var(--ink-sage)" size="8cqw" rotate={10} style={{ position: "absolute", bottom: "9cqw", left: "10cqw" }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Memory pages                                                        */
/* ------------------------------------------------------------------ */

interface MemoryPageProps {
  memory: Memory;
  text: string;
  continued: boolean;
  hasMore: boolean;
  dateOfBirth: string;
  pageNumber: number;
}

export function MemoryPage({ memory, text, continued, hasMore, dateOfBirth, pageNumber }: MemoryPageProps) {
  const layout = layoutMemory(memory, pageNumber, usePageFormat());
  const textRef = useFitText<HTMLDivElement>(text);
  const { top, bottom } = layout.doodles;

  return (
    <article className="paper memory-page">
      {continued ? (
        <header className="memory-page__header memory-page__header--continued">
          <p className="memory-date">{longDate(memory.date)}</p>
          <p className="memory-continued">…{memory.title ? `${memory.title}, continued` : "continued"}</p>
        </header>
      ) : (
        <header className="memory-page__header">
          <p className="memory-date">{longDate(memory.date)}</p>
          <p className="memory-age">{ageStamp(dateOfBirth, memory.date)}</p>
          {memory.title && (
            <h3 className="memory-title">
              {memory.title}
              <Squiggle color={top.color} />
            </h3>
          )}
        </header>
      )}

      <Doodle
        kind={top.kind}
        color={top.color}
        size={`${top.size}cqw`}
        rotate={top.rotate}
        style={{ position: "absolute", top: "7.5cqw", right: "8cqw" }}
      />

      {!continued && layout.photos.length > 0 && (
        <div className="memory-photos" style={{ height: `${layout.areaHeight}cqw`, width: `${CONTENT_WIDTH}cqw` }}>
          {layout.photos.map((p) => (
            <PhotoFrame
              key={p.index}
              photo={memory.photos[p.index]}
              frame={p.frame}
              width={p.width}
              rotate={p.rotate}
              tape={p.tape}
              style={{ position: "absolute", left: `${p.left}cqw`, top: `${p.top}cqw`, zIndex: p.index + 1 }}
            />
          ))}
        </div>
      )}

      <div ref={textRef} className={`memory-text${continued || layout.photos.length === 0 ? " memory-text--ruled" : ""}`}>
        {text.split(/\n\s*\n/).map((para, i) => (
          <p key={i}>{para}</p>
        ))}
        {hasMore && <p className="memory-more">continued overleaf →</p>}
      </div>

      <footer className="memory-page__footer">
        <div className="memory-tags">
          {!continued && memory.tags.map((tag, i) => <TagStamp key={tag} tag={tag} rotate={i % 2 ? 3 : -4} />)}
        </div>
        <PageNumber n={pageNumber} />
        <div className="memory-footer-doodle">
          <Doodle kind={bottom.kind} color={bottom.color} size={`${bottom.size}cqw`} rotate={bottom.rotate} />
        </div>
      </footer>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Notes & end                                                         */
/* ------------------------------------------------------------------ */

export function NotesPage({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="paper notes-page">
      <p className="notes-page__label">little notes</p>
      <div className="notes-page__lines" />
      <footer className="memory-page__footer">
        <div />
        <PageNumber n={pageNumber} />
        <div />
      </footer>
    </div>
  );
}

export function EndPage({ settings }: { settings: BookSettings }) {
  return (
    <div className="paper end-page">
      <WashiTape color="honey" pattern="dots" style={{ width: "22cqw", top: "16cqw", left: "50%", transform: "translateX(-50%) rotate(-3deg)" }} />
      <div className="end-page__body">
        <Doodle kind="moon" color="var(--ink-sky)" size="12cqw" rotate={-12} />
        <p className="end-page__text">to be continued…</p>
        <p className="end-page__sub">so many more pages to fill, {settings.childName}</p>
        <div className="end-page__doodles">
          <Doodle kind="star" color="var(--ink-honey)" size="4.5cqw" rotate={-10} />
          <Doodle kind="heart" color="var(--ink-rose)" size="5cqw" rotate={6} />
          <Doodle kind="star" color="var(--ink-honey)" size="4.5cqw" rotate={14} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dispatcher                                                          */
/* ------------------------------------------------------------------ */

export function BookPageView({ page, index, settings }: { page: BookPage; index: number; settings: BookSettings }) {
  switch (page.kind) {
    case "cover":
      return <CoverPage settings={settings} />;
    case "back":
      return <BackCoverPage settings={settings} />;
    case "endpaper":
      return <EndpaperPage side={page.side} settings={settings} />;
    case "title":
      return <TitlePage settings={settings} />;
    case "memory":
      return (
        <MemoryPage
          memory={page.memory}
          text={page.text}
          continued={page.continued}
          hasMore={page.hasMore}
          dateOfBirth={settings.dateOfBirth}
          pageNumber={pageNumber(index)}
        />
      );
    case "notes":
      return <NotesPage pageNumber={pageNumber(index)} />;
    case "end":
      return <EndPage settings={settings} />;
  }
}
