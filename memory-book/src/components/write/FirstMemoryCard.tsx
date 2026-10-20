import Link from "next/link";
import { FIRST_MEMORY_BUTTON, TAGLINE, TAGLINE_HIGHLIGHT } from "@/content/marketing";
import { PlusIcon, SparklesIcon } from "@/components/ui/Icons";

/** A new, empty book: the tagline and one friendly button to the first memory. */
export function FirstMemoryCard({
  note,
  href,
  onAdd,
  compact = false,
}: {
  /** A line under the tagline (e.g. "Mira's book is ready"). */
  note?: string;
  /** Where the button goes… */
  href?: string;
  /** …or what it does. */
  onAdd?: () => void;
  compact?: boolean;
}) {
  const at = TAGLINE_HIGHLIGHT ? TAGLINE.indexOf(TAGLINE_HIGHLIGHT) : -1;
  const button = (
    <>
      <PlusIcon className="size-5" /> {FIRST_MEMORY_BUTTON}
    </>
  );
  const buttonClass = "chrome-button chrome-button--primary !h-12 !px-6 !text-base";
  return (
    <section className={`sheet first-memory text-center ${compact ? "!py-5" : "!py-7"}`} aria-label={FIRST_MEMORY_BUTTON}>
      <span className="welcome-badge" aria-hidden>
        <SparklesIcon />
      </span>
      <h2 className="first-memory__tagline mt-2">
        {at < 0 ? (
          TAGLINE
        ) : (
          <>
            {TAGLINE.slice(0, at)}
            <span className="first-memory__accent">{TAGLINE_HIGHLIGHT}</span>
            {TAGLINE.slice(at + TAGLINE_HIGHLIGHT.length)}
          </>
        )}
      </h2>
      {note && <p className="mt-2 text-ink-soft">{note}</p>}
      <div className="mt-5 flex justify-center">
        {href ? (
          <Link href={href} className={buttonClass}>
            {button}
          </Link>
        ) : (
          <button type="button" className={buttonClass} onClick={onAdd}>
            {button}
          </button>
        )}
      </div>
    </section>
  );
}
