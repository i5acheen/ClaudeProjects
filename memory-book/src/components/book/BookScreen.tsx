"use client";

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
import { FirstMemoryCard } from "@/components/write/FirstMemoryCard";
import { GuidedSheet } from "./GuidedSheet";
import { WritingHintsContext } from "./BookPages";

/** The signed-in book: the same reader as the demo, with your own memories — and you can write straight into it. */
export function BookScreen({ startMemoryId }: { startMemoryId?: string }) {
  const [writing, setWriting] = useState<{ memory?: Memory; letter?: boolean } | null>(null);
  const [focusId, setFocusId] = useState<string>();
  const [editingCover, setEditingCover] = useState(false);
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [styling, setStyling] = useState<Memory[] | null>(null);
  const [guided, setGuided] = useState<{ memory?: Memory } | null>(null);
  const { access } = useJournal();

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <BookGate>
        {(journal) => (
          <>
            <TopBar title={journal.settings.bookTitle} basePath="/book" active="book" />
            <SyncBanner />
            {journal.memories.length === 0 && access.canEdit && (
              <div className="mx-auto w-full max-w-md px-3 pt-1">
                <FirstMemoryCard compact onAdd={() => setWriting({})} />
              </div>
            )}
            <WritingHintsContext.Provider value={access.canEdit}>
            <BookReader
              journal={journal}
              startMemoryId={startMemoryId}
              focusMemoryId={focusId}
              onEdit={access.canEdit ? (memory) => (memory.kind === "guided" ? setGuided({ memory }) : setWriting({ memory })) : undefined}
              onNewNote={access.canEdit ? () => setWriting({ letter: true }) : undefined}
              onNewPage={access.canEdit ? () => setWriting({}) : undefined}
              onEditCover={access.isOwner ? () => setEditingCover(true) : undefined}
              onEditMonth={access.canEdit ? setEditingMonth : undefined}
              onPageStyle={access.canEdit ? setStyling : undefined}
              onNewGuided={access.canEdit ? () => setGuided({}) : undefined}
            />
            </WritingHintsContext.Provider>
            {editingMonth !== null && <MonthSheet journal={journal} months={editingMonth} onClose={() => setEditingMonth(null)} />}
            {guided && (
              <GuidedSheet
                journal={journal}
                memory={guided.memory}
                onClose={() => setGuided(null)}
                onSaved={(id) => {
                  setGuided(null);
                  setFocusId(id);
                }}
              />
            )}
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
