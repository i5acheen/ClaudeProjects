"use client";

import Link from "next/link";
import { BookIcon, GearIcon, GridIcon, PenIcon } from "./Icons";
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
 * The only chrome on screen. Two sections — Write (add photos and words)
 * and Journal (read the book) — plus the timeline and settings.
 */
export function TopBar({ title, basePath, active, demo, canWrite: canWriteProp }: TopBarProps) {
  const book = useOptionalJournal();
  const canWrite = canWriteProp ?? book?.access.canEdit ?? true;
  const inJournal = active === "book" || active === "timeline";
  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
      <Link
        href={demo ? "/" : canWrite ? `${basePath}/write` : basePath}
        className="hidden min-w-0 truncate font-serif text-lg font-semibold italic text-ink-soft hover:text-ink md:block"
      >
        {title}
        {demo && (
          <span className="ml-2 rounded-full bg-white/50 px-2 py-0.5 align-middle font-serif text-xs tracking-wider text-ink-soft uppercase not-italic">
            demo
          </span>
        )}
      </Link>

      <nav className="section-tabs" aria-label="Sections">
        {demo ? (
          <Link href="/" className="section-tab" title="Sign in to write your own book">
            <PenIcon /> Write
          </Link>
        ) : canWrite ? (
          <Link href={`${basePath}/write`} className="section-tab" aria-current={active === "write" ? "page" : undefined}>
            <PenIcon /> Write
          </Link>
        ) : null}
        <Link href={basePath} className="section-tab" aria-current={inJournal ? "page" : undefined}>
          <BookIcon /> Journal
        </Link>
      </nav>

      <nav className="flex shrink-0 items-center gap-1" aria-label="More">
        <Link
          href={`${basePath}/timeline`}
          className="chrome-button !px-2.5"
          aria-current={active === "timeline" ? "page" : undefined}
          title="Timeline"
        >
          <GridIcon />
          <span className="hidden lg:inline">Timeline</span>
        </Link>
        {demo ? (
          <Link href="/" className="chrome-button chrome-button--primary whitespace-nowrap" title="Sign in to start your own book">
            Start yours
          </Link>
        ) : (
          <Link
            href={`${basePath}/settings`}
            className="chrome-button !px-2.5"
            aria-current={active === "settings" ? "page" : undefined}
            title="Settings"
          >
            <GearIcon />
          </Link>
        )}
      </nav>
    </header>
  );
}
