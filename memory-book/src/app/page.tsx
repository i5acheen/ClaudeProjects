import Link from "next/link";
import { CoverPage } from "@/components/book/BookPages";
import { InkFilters } from "@/components/book/Doodles";
import { demoJournal } from "@/lib/demo-data";

export default function HomePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-10 px-6 py-12 md:flex-row md:gap-16">
      <InkFilters />
      <Link
        href="/demo"
        aria-label="Open the demo book"
        className="block w-[min(68vw,300px)] shrink-0 -rotate-2 transition-transform duration-500 hover:rotate-0 drop-shadow-[0_18px_22px_rgba(90,60,30,0.28)]"
      >
        <div className="aspect-[3/4] w-full [container-type:size]">
          <CoverPage settings={demoJournal.settings} />
        </div>
      </Link>

      <div className="max-w-sm text-center md:text-left">
        <h1 className="font-serif text-5xl font-semibold text-ink">Memory Book</h1>
        <p className="mt-3 font-hand text-2xl leading-snug text-ink-soft">
          A little keepsake journal of the everyday moments — written now, to be read when she&rsquo;s grown.
        </p>
        <p className="mt-4 font-serif text-lg text-ink-soft">
          Your photos and words stay in your own Google Drive.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row">
          <Link href="/demo" className="chrome-button chrome-button--primary justify-center whitespace-nowrap !h-12 !px-6 !text-lg">
            Open the demo book
          </Link>
          <button className="chrome-button justify-center whitespace-nowrap !h-12 !px-6 !text-lg" disabled title="Coming in stage 2">
            Sign in with Google
          </button>
        </div>
      </div>
    </main>
  );
}
