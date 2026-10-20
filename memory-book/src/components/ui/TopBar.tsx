"use client";

import Link from "next/link";
import { BookSwitcher } from "./BookSwitcher";
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
  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-2 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        {!demo && <BookSwitcher />}
      <Link
        href={demo ? "/" : canWrite ? `${basePath}/write` : basePath}
        className="hidden min-w-0 items-center gap-2.5 truncate text-[0.95rem] font-semibold tracking-tight text-ink hover:opacity-80 md:flex"
      >
        <img src="/icons/icon-192.png" alt="" className="size-8 shrink-0 rounded-[0.6rem] shadow-sm" />
        <span className="truncate">{title}</span>
        {demo && (
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[0.7rem] font-semibold tracking-wide text-ink-soft uppercase">
            demo
          </span>
        )}
      </Link>
      </div>

      <nav className="section-tabs" aria-label="Sections">
        {!demo && canWrite ? (
          <Link href={`${basePath}/write`} className="section-tab" aria-current={active === "write" ? "page" : undefined}>
            <PenIcon /> Write
          </Link>
        ) : null}
        <Link href={basePath} className="section-tab" aria-current={active === "book" ? "page" : undefined}>
          <BookIcon /> Journal
        </Link>
        <Link href={`${basePath}/timeline`} className="section-tab" aria-current={active === "timeline" ? "page" : undefined}>
          <GridIcon /> Timeline
        </Link>
      </nav>

      <nav className="flex shrink-0 items-center gap-1" aria-label="More">
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
