"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useJournal } from "@/components/journal/JournalProvider";
import type { Journal } from "@/lib/types";
import { MemoryEditor } from "@/components/editor/MemoryEditor";
import { SyncBanner } from "@/components/journal/SyncBanner";
import { TopBar } from "@/components/ui/TopBar";
import { DriveFolderCard, DriveRefreshButton } from "./DriveFolderCard";
import { WaitingCard } from "./WaitingCard";
import { DuplicateCleaner } from "./DuplicateCleaner";
import { GrowthCard } from "./GrowthCard";

/**
 * The writing desk: add photos and words for a new memory, and give words
 * to photos that are already in the book (e.g. from your Drive folder).
 */
export function WriteScreen({ journal }: { journal: Journal }) {
  const { settings } = journal;
  const waiting = journal.memories
    .filter((m) => !m.text.trim() && m.photos.length > 0)
    .sort((a, b) => b.date.localeCompare(a.date));
  const { access } = useJournal();
  const router = useRouter();

  // Photos shared from the phone's gallery arrive here (Android "Share → Memory Book").
  const [sharedNote, setSharedNote] = useState<string | null>(null);
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get("shared");
    if (!shared) return;
    setSharedNote(
      shared === "failed"
        ? "The shared photos didn't come through. Open Memory Book once, then share them again."
        : shared === "0"
          ? "Only photos can be shared into Memory Book."
          : null,
    );
    window.history.replaceState(null, "", "/book/write");
  }, []);

  // Family who can only view the book have nothing to write here.
  useEffect(() => {
    if (!access.canEdit) router.replace("/book");
  }, [access.canEdit, router]);

  return (
    <main className="min-h-dvh pb-20">
      <TopBar title={settings.bookTitle} basePath="/book" active="write" />
      <SyncBanner />

      <div className="mx-auto max-w-xl space-y-8 px-3 pt-2 sm:px-4">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {sharedNote && <p className="mr-auto text-sm text-[var(--ink-terracotta)]">{sharedNote}</p>}
          <DriveRefreshButton className="!h-10 !text-sm" />
        </div>
        {waiting.length > 0 && (
          <section aria-labelledby="waiting-heading">
            <h2 id="waiting-heading" className="mb-1 ui-h2">
              Waiting for your words <span className="text-ink-faint">({waiting.length})</span>
            </h2>
            <p className="text-ink-soft">These photos are already in the book. Add a few lines whenever you have a moment.</p>
            <div className="mt-1 mb-4">
              <DuplicateCleaner compact />
            </div>
            <div className="space-y-6">
              {waiting.map((memory) => (
                <WaitingCard key={memory.id} memory={memory} dateOfBirth={settings.dateOfBirth} childName={settings.childName} />
              ))}
            </div>
          </section>
        )}

        <MemoryEditor journal={journal} variant="inline" />

        <GrowthCard journal={journal} />

        <DriveFolderCard />

        <p className="text-center text-lg text-ink-soft">
          <Link href="/book" className="underline decoration-dotted underline-offset-4 hover:text-ink">
            Open the journal →
          </Link>
        </p>
      </div>
    </main>
  );
}
