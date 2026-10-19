"use client";

import { BookGate } from "@/components/journal/BookGate";
import { SyncBanner } from "@/components/journal/SyncBanner";
import { Timeline } from "@/components/timeline/Timeline";
import { TopBar } from "@/components/ui/TopBar";

export default function TimelinePage() {
  return (
    <main className="min-h-dvh">
      <BookGate>
        {(journal) => (
          <>
            <TopBar title={journal.settings.bookTitle} basePath="/book" active="timeline" />
            <SyncBanner />
            <Timeline journal={journal} basePath="/book" />
          </>
        )}
      </BookGate>
    </main>
  );
}
