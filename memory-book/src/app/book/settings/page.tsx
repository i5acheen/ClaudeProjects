"use client";

import { BookGate } from "@/components/journal/BookGate";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { TopBar } from "@/components/ui/TopBar";

export default function SettingsPage() {
  return (
    <main className="min-h-dvh pb-16">
      <BookGate>
        {(journal) => (
          <>
            <TopBar title={journal.settings.bookTitle} basePath="/book" active="settings" />
            <SettingsForm journal={journal} />
          </>
        )}
      </BookGate>
    </main>
  );
}
