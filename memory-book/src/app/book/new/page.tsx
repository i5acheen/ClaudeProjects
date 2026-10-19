"use client";

import { BookGate } from "@/components/journal/BookGate";
import { MemoryEditor } from "@/components/editor/MemoryEditor";

export default function NewMemoryPage() {
  return <BookGate>{(journal) => <MemoryEditor journal={journal} />}</BookGate>;
}
