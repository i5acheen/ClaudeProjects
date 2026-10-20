"use client";

import Link from "next/link";
import { BookSwitcher } from "./BookSwitcher";
import { BackButton } from "./BackButton";
import { BookIcon, GearIcon, GridIcon, LogoMark, PenIcon, PlusIcon } from "./Icons";
import { useOptionalJournal } from "@/components/journal/JournalProvider";

interface TopBarProps {
  title: string;
  basePath: string;
  active?: "write" | "book" | "timeline" | "settings";
  demo?: boolean;
  /** False for family who can only view the book. */
  canWrite?: boolean;
}

/**
 * The app's chrome, kept quiet so the book is the focus. Three sections:
 * Write (add photos and words), Journal (read the book) and Timeline. On
 * computers they sit in the top bar; on phones in a tab bar at the bottom,
 * within reach of the thumb, with Write as the big button in the middle.
 */
export function TopBar({ title, basePath, active, demo, canWrite: canWriteProp }: TopBarProps) {
  const book = useOptionalJournal();
  const canWrite = !demo && (canWriteProp ?? book?.access.canEdit ?? true);
  const current = (section: TopBarProps["active"]) => (active === section ? "page" : undefined);
  // Where Back goes when there's no earlier page in the app to return to.
  const backTo = active === "book" ? (demo ? "/" : canWrite ? `${basePath}/write` : "/") : basePath;

  return (
    <>
      <AppSky />
      <header className="app-header">
        <div className="flex min-w-0 items-center gap-2">
          <BackButton fallback={backTo} />
          {!demo && <BookSwitcher />}
          <Link
            href={demo ? "/" : canWrite ? `${basePath}/write` : basePath}
            className="flex min-w-0 items-center gap-2.5 text-[0.95rem] font-semibold tracking-tight text-ink hover:opacity-80"
          >
            <LogoMark className="size-8 shrink-0 drop-shadow-sm" />
            <span className="truncate">{title}</span>
            {demo && (
              <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ink-soft uppercase">
                demo
              </span>
            )}
          </Link>
        </div>

        <nav className="section-tabs" aria-label="Sections">
          {canWrite && (
            <Link href={`${basePath}/write`} className="section-tab" aria-current={current("write")}>
              <PenIcon /> Write
            </Link>
          )}
          <Link href={basePath} className="section-tab" aria-current={current("book")}>
            <BookIcon /> Journal
          </Link>
          <Link href={`${basePath}/timeline`} className="section-tab" aria-current={current("timeline")}>
            <GridIcon /> Timeline
          </Link>
        </nav>

        <nav className="flex shrink-0 items-center justify-end gap-1" aria-label="More">
          {demo ? (
            <Link href="/" className="chrome-button chrome-button--primary whitespace-nowrap" title="Sign in to start your own book">
              Start yours
            </Link>
          ) : (
            <Link href={`${basePath}/settings`} className="icon-button" aria-current={current("settings")} title="Settings">
              <GearIcon />
              <span className="sr-only">Settings</span>
            </Link>
          )}
        </nav>
      </header>

      <nav className="tabbar" aria-label="Sections">
        <Link href={basePath} className="tabbar__item" aria-current={current("book")}>
          <span className="tabbar__icon">
            <BookIcon />
          </span>
          Journal
        </Link>
        {canWrite && (
          <Link href={`${basePath}/write`} className="tabbar__item tabbar__item--write" aria-current={current("write")}>
            <span className="tabbar__fab">
              <PlusIcon />
            </span>
            Write
          </Link>
        )}
        <Link href={`${basePath}/timeline`} className="tabbar__item" aria-current={current("timeline")}>
          <span className="tabbar__icon">
            <GridIcon />
          </span>
          Timeline
        </Link>
      </nav>
    </>
  );
}

/** A few clouds in the sky at the top of the screen, as on the home page. */
function AppSky() {
  const cloud = "M25 40a15 15 0 0 1 2-30 20 20 0 0 1 37-6 16 16 0 0 1 26 12 12 12 0 0 1 0 24z";
  return (
    <div className="app-sky" aria-hidden>
      {["a", "b", "c"].map((k) => (
        <svg key={k} className={`app-sky__cloud app-sky__cloud--${k}`} viewBox="0 0 100 44">
          <path d={cloud} />
        </svg>
      ))}
    </div>
  );
}
