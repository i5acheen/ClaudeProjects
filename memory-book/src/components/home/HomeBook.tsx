"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { CoverPage } from "@/components/book/BookPages";
import { demoJournal } from "@/lib/demo-data";

function Cover() {
  return (
    <div className="aspect-[3/4] w-full [container-type:size]">
      <CoverPage settings={demoJournal.settings} priority />
    </div>
  );
}

// The page-turning book is only loaded when someone taps the cover, so the home page stays quick.
const OpenBook = dynamic(() => import("./HomeBookOpen").then((m) => m.HomeBookOpen), {
  ssr: false,
  loading: () => (
    <div className="home-book home-book--loading" aria-busy>
      <Cover />
    </div>
  ),
});

/** The demo book on the home page: tap it and it opens, turning its first pages by itself. */
export function HomeBook() {
  const [open, setOpen] = useState(false);
  if (open) return <OpenBook />;
  return (
    <button type="button" className="home-book" onClick={() => setOpen(true)} aria-label="Open the book and turn its pages">
      <Cover />
      <span className="home-book__hint" aria-hidden>
        Tap to open
      </span>
    </button>
  );
}
