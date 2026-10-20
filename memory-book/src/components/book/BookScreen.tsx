"use client";

import Link from "next/link";
import { useState } from "react";
import type { Memory } from "@/lib/types";
import { BookGate } from "@/components/journal/BookGate";
import { useJournal } from "@/components/journal/JournalProvider";
import { SyncBanner } from "@/components/journal/SyncBanner";
import { TopBar } from "@/components/ui/TopBar";
import { BookReader } from "./BookReader";
import { NoteSheet } from "./NoteSheet";
import { CoverSheet } from "./CoverSheet";
import { MonthSheet } from "./MonthSheet";
import { PageStyleSheet } from "./PageStyleSheet";
import { WritingHintsContext } from "./BookPages";

/** The signed-in book: the same reader as the demo, with your own memories — and you can write straight into it. */
export function BookScreen({ startMemoryId }: { startMemoryId?: string }) {
  const [writing, setWriting] = useState<{ memory?: Memory; letter?: boolean } | null>(null);
  const [focusId, setFocusId] = useState<string>();
  const [editingCover, setEditingCover] = useState(false);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [styling, setStyling] = useState<Memory[] | null>(null);
  const { access } = useJournal();

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <BookGate>
        {(journal) => (
          <>
            <TopBar title={journal.settings.bookTitle} basePath="/book" active="book" />
            <SyncBanner />
            {journal.memories.length === 0 && access.canEdit && (
              <p className="text-center font-hand text-2xl text-ink-soft">
                Your book is ready.{" "}
                <button type="button" onClick={() => setWriting({})} className="underline decoration-dotted underline-offset-4 hover:text-ink">
                  Write the first page
                </button>{" "}
                or{" "}
                <Link href="/book/write" className="underline decoration-dotted underline-offset-4 hover:text-ink">
                  add photos
                </Link>
              </p>
            )}
            <WritingHintsContext.Provider value={access.canEdit}>
            <BookReader
              journal={journal}
              startMemoryId={startMemoryId}
              focusMemoryId={focusId}
              onEdit={access.canEdit ? (memory) => setWriting({ memory }) : undefined}
              onNewNote={access.canEdit ? () => setWriting({ letter: true }) : undefined}
              onNewPage={access.canEdit ? () => setWriting({}) : undefined}
              onEditCover={access.isOwner ? () => setEditingCover(true) : undefined}
              onEditMonth={access.canEdit ? setEditingMonth : undefined}
              onPageStyle={access.canEdit ? setStyling : undefined}
            />
            </WritingHintsContext.Provider>
            {editingMonth !== null && <MonthSheet journal={journal} months={editingMonth} onClose={() => setEditingMonth(null)} />}
            {styling && (
              <PageStyleSheet journal={journal} memories={styling} canStyleBook={access.isOwner} onClose={() => setStyling(null)} />
            )}
            {editingCover && <CoverSheet settings={journal.settings} onClose={() => setEditingCover(false)} />}
            {writing && (
              <NoteSheet
                journal={journal}
                memory={writing.memory}
                letter={writing.letter}
                onClose={() => setWriting(null)}
                onSaved={(id) => {
                  setWriting(null);
                  setFocusId(id);
                }}
              />
            )}
          </>
        )}
      </BookGate>
    </main>
  );
}
