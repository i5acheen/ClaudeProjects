"use client";

import Link from "next/link";
import { BookGate } from "@/components/journal/BookGate";
import { SyncBanner } from "@/components/journal/SyncBanner";
import { TopBar } from "@/components/ui/TopBar";
import { BookReader } from "./BookReader";

/** The signed-in book: the same reader as the demo, with your own memories. */
export function BookScreen({ startMemoryId }: { startMemoryId?: string }) {
  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <BookGate>
        {(journal) => (
          <>
            <TopBar title={journal.settings.bookTitle} basePath="/book" active="book" />
            <SyncBanner />
            {journal.memories.length === 0 && (
              <p className="text-center font-hand text-2xl text-ink-soft">
                Your book is ready.{" "}
                <Link href="/book/write" className="underline decoration-dotted underline-offset-4 hover:text-ink">
                  Add the first memory
                </Link>
              </p>
            )}
            <BookReader journal={journal} startMemoryId={startMemoryId} editHref={(id) => `/book/edit/${encodeURIComponent(id)}`} />
          </>
        )}
      </BookGate>
    </main>
  );
}
