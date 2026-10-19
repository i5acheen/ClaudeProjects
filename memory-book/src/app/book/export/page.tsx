"use client";

import { BookGate } from "@/components/journal/BookGate";
import { ExportBook } from "@/components/export/ExportBook";
import { TopBar } from "@/components/ui/TopBar";

export default function ExportPage() {
  return (
    <main className="min-h-dvh">
      <BookGate>
        {(journal) => (
          <>
            <div className="no-print">
              <TopBar title={journal.settings.bookTitle} basePath="/book" />
            </div>
            <ExportBook journal={journal} />
          </>
        )}
      </BookGate>
    </main>
  );
}
