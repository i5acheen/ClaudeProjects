import Link from "next/link";
import { BookIcon, GearIcon, GridIcon, PlusIcon } from "./Icons";

interface TopBarProps {
  title: string;
  basePath: string;
  active?: "book" | "timeline" | "settings";
  demo?: boolean;
}

/** The only chrome above the book: title on the left, a few quiet actions on the right. */
export function TopBar({ title, basePath, active, demo }: TopBarProps) {
  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center justify-between gap-2 px-4">
      <Link href={basePath} className="truncate font-serif text-lg font-semibold italic text-ink-soft hover:text-ink">
        {title}
        {demo && (
          <span className="ml-2 hidden rounded-full bg-white/50 px-2 py-0.5 align-middle font-serif text-xs tracking-wider text-ink-soft uppercase not-italic sm:inline">
            demo
          </span>
        )}
      </Link>
      <nav className="flex shrink-0 items-center gap-1">
        <Link href={basePath} className="chrome-button" aria-current={active === "book" ? "page" : undefined} title="Book">
          <BookIcon />
          <span className="hidden sm:inline">Book</span>
        </Link>
        <Link
          href={`${basePath}/timeline`}
          className="chrome-button"
          aria-current={active === "timeline" ? "page" : undefined}
          title="Timeline"
        >
          <GridIcon />
          <span className="hidden sm:inline">Timeline</span>
        </Link>
        {demo ? (
          <>
            <button className="chrome-button max-sm:!hidden" disabled title="Settings (sign in to use)">
              <GearIcon />
            </button>
            <Link href="/" className="chrome-button chrome-button--primary" title="Sign in to start your own book">
              <PlusIcon />
              <span className="hidden sm:inline">Start your book</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              href={`${basePath}/settings`}
              className="chrome-button"
              aria-current={active === "settings" ? "page" : undefined}
              title="Settings"
            >
              <GearIcon />
            </Link>
            <Link href={`${basePath}/new`} className="chrome-button chrome-button--primary" title="Add memory">
              <PlusIcon />
              <span className="hidden sm:inline">Add memory</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
