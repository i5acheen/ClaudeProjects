"use client";

import { use } from "react";
import { BookGate, Notice } from "@/components/journal/BookGate";
import { MemoryEditor } from "@/components/editor/MemoryEditor";

export default function EditMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const memoryId = decodeURIComponent(id);
  return (
    <BookGate>
      {(journal) => {
        const memory = journal.memories.find((m) => m.id === memoryId);
        return memory ? (
          <MemoryEditor journal={journal} memory={memory} />
        ) : (
          <Notice title="Memory not found">
            <p>It may have been deleted on another device.</p>
          </Notice>
        );
      }}
    </BookGate>
  );
}
