"use client";

import { createContext, useContext } from "react";
import type { BookSettings, GrowthEntry, Memory, Tag } from "@/lib/types";
import { pageNumber, type BookPage } from "@/lib/pagination";
import { ageStamp, longDate, monthOfAgeRange, shortDate } from "@/lib/dates";
import { CONTENT_WIDTH, layoutMemory } from "@/lib/layout";
import { Doodle } from "./Doodles";
import { PhotoFrame, WashiTape } from "./PhotoFrame";
import { usePhotoSrc } from "./PhotoSource";
import { useFitText } from "./useFitText";
import { coverTheme } from "@/lib/book-style";
import { TAG_META, tagSlug } from "@/lib/tags";
import { usePageFormat } from "./PageFormatContext";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */



function TagStamp({ tag, rotate }: { tag: Tag; rotate: number }) {
  return (
    <span className={`tag-stamp tag-stamp--${tagSlug(tag)}`} style={{ transform: `rotate(${rotate}deg)` }}>
      <span aria-hidden>{TAG_META[tag].icon}</span> {tag}
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
  const theme = coverTheme(settings);

  // Full photo: the picture fills the cover, the title sits on a cream label.
  if (theme === "photo" && coverSrc) {
    return (
      <div className="cover cover--photo">
        <img className="cover__bleed" src={coverSrc} alt="" draggable={false} />
        <div className="cover__shade" />
        <div className="cover__label">
          <h1 className="cover__title">{settings.bookTitle}</h1>
          <span className="cover__rule" />
          <p className="cover__subtitle">
            for {settings.childName} · {shortDate(settings.dateOfBirth)}
          </p>
        </div>
      </div>
    );
  }

  // Modern portrait: clean paper, title on top, a big photo below.
  if (theme === "portrait") {
    return (
      <div className="cover cover--portrait">
        <div className="portrait__head">
          <h1 className="cover__title">{settings.bookTitle}</h1>
          <span className="cover__rule" />
          <p className="cover__subtitle">
            for {settings.childName} · {shortDate(settings.dateOfBirth)}
          </p>
        </div>
        <div className="portrait__photo">
          {coverSrc ? (
            <img src={coverSrc} alt="" draggable={false} />
          ) : (
            <Doodle kind="heart" color="var(--cover-ink)" size="22cqw" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`cover cover--${theme}`}>
      <div className="cover__frame">
        <p className="cover__eyebrow">a book of memories</p>
        <h1 className="cover__title">{settings.bookTitle}</h1>
        <div className="cover__window">
          {coverSrc ? (
            <img src={coverSrc} alt="" draggable={false} />
          ) : (
            <Doodle kind="heart" color="var(--cover-ink)" size="20cqw" />
          )}
        </div>
        <p className="cover__name">for {settings.childName}</p>
        <p className="cover__born">born {longDate(settings.dateOfBirth)}</p>
        <div className="cover__stars" aria-hidden>
          <Doodle kind="sparkle" color="var(--cover-ink)" size="5cqw" rotate={-8} />
          <Doodle kind={theme === "sage" ? "flower" : "star"} color="var(--cover-ink)" size="4cqw" rotate={12} />
          <Doodle kind="sparkle" color="var(--cover-ink)" size="5cqw" rotate={6} />
        </div>
      </div>
    </div>
  );
}

export function BackCoverPage({ settings }: { settings: BookSettings }) {
  return (
    <div className={`cover cover--back cover--${coverTheme(settings)}`}>
      <div className="back__emblem">
        <Doodle kind="heart" color="var(--cover-ink)" size="11cqw" />
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
  childName: string;
  pageNumber: number;
}

export function MemoryPage({ memory, text, continued, hasMore, dateOfBirth, childName, pageNumber }: MemoryPageProps) {
  const layout = layoutMemory(memory, pageNumber, usePageFormat());
  const textRef = useFitText<HTMLDivElement>(text);
  const { top, bottom } = layout.doodles;
  const showHints = useContext(WritingHintsContext);
  const isLetter = memory.kind === "letter";

  return (
    <article className={`paper memory-page${isLetter ? " memory-page--letter" : ""}`}>
      {continued ? (
        <header className="memory-page__header memory-page__header--continued">
          <p className="memory-date">{longDate(memory.date)}</p>
          <p className="memory-continued">…{memory.title ? `${memory.title}, continued` : "continued"}</p>
        </header>
      ) : (
        <header className="memory-page__header">
          {isLetter && <p className="letter-eyebrow">a letter for {childName}</p>}
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
        {/* Only on screen, for whoever can write: never in the PDF. */}
        {showHints && !text.trim() && !continued && <p className="memory-hint">✎ add a few lines…</p>}
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

/** Turned on in the signed-in book for people who can write, to show gentle "add a few lines" hints. */
export const WritingHintsContext = createContext(false);

/** A time-capsule letter that isn't open yet. */
export function SealedLetterPage({ memory, childName, pageNumber }: { memory: Memory; childName: string; pageNumber: number }) {
  return (
    <div className="paper sealed-page">
      <div className="sealed-page__body">
        <div className="envelope" aria-hidden>
          <span className="envelope__flap" />
          <span className="envelope__seal">
            <Doodle kind="heart" color="#fbe9df" size="7cqw" />
          </span>
        </div>
        <p className="sealed-page__for">a letter for {childName}</p>
        {memory.title && <p className="sealed-page__title">{memory.title}</p>}
        <p className="sealed-page__until">sealed until {longDate(memory.sealedUntil!)}</p>
        <p className="sealed-page__written">written {longDate(memory.date)}</p>
      </div>
      <footer className="memory-page__footer">
        <div />
        <PageNumber n={pageNumber} />
        <div />
      </footer>
    </div>
  );
}

/** A divider at the start of each month of age, with height and weight if you've noted them. */
export function MonthPage({ months, settings, growth }: { months: number; settings: BookSettings; growth?: GrowthEntry }) {
  const range = monthOfAgeRange(settings.dateOfBirth, months);
  const label = months === 0 ? "The first month" : `${months} month${months === 1 ? "" : "s"}`;
  return (
    <div className="paper month-page">
      <div className="month-page__body">
        <Doodle kind="sparkle" color="var(--ink-honey)" size="6cqw" rotate={-10} />
        <p className="month-page__eyebrow">{settings.childName}</p>
        <h2 className="month-page__title">{label}</h2>
        <Squiggle />
        <p className="month-page__range">
          {shortDate(range.from)} – {shortDate(range.to)}
        </p>
        {(growth?.height || growth?.weight) && (
          <div className="month-page__growth">
            {growth.height && (
              <span className="growth-badge">
                <span className="growth-badge__label">height</span>
                <span className="growth-badge__value">{growth.height}</span>
              </span>
            )}
            {growth.weight && (
              <span className="growth-badge growth-badge--weight">
                <span className="growth-badge__label">weight</span>
                <span className="growth-badge__value">{growth.weight}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** A quiet page that keeps a two-page memory together on one spread. */
export function FillerPage({ seed }: { seed: number }) {
  const kinds = ["flower", "heart", "moon", "star"] as const;
  return (
    <div className="paper filler-page">
      <Doodle kind={kinds[seed % kinds.length]} color="var(--ink-faint)" size="10cqw" rotate={seed % 2 ? 8 : -8} />
    </div>
  );
}

export function BookPageView({
  page,
  index,
  settings,
  growth,
}: {
  page: BookPage;
  index: number;
  settings: BookSettings;
  growth?: Record<string, GrowthEntry>;
}) {
  switch (page.kind) {
    case "cover":
      return <CoverPage settings={settings} />;
    case "back":
      return <BackCoverPage settings={settings} />;
    case "endpaper":
      return <EndpaperPage side={page.side} settings={settings} />;
    case "title":
      return <TitlePage settings={settings} />;
    case "month":
      return <MonthPage months={page.months} settings={settings} growth={growth?.[String(page.months)]} />;
    case "filler":
      return <FillerPage seed={index} />;
    case "memory":
      if (page.sealed) {
        return <SealedLetterPage memory={page.memory} childName={settings.childName} pageNumber={pageNumber(index)} />;
      }
      return (
        <MemoryPage
          memory={page.memory}
          text={page.text}
          continued={page.continued}
          hasMore={page.hasMore}
          dateOfBirth={settings.dateOfBirth}
          childName={settings.childName}
          pageNumber={pageNumber(index)}
        />
      );
    case "notes":
      return <NotesPage pageNumber={pageNumber(index)} />;
    case "end":
      return <EndPage settings={settings} />;
  }
}
