"use client";

import { BookGate } from "@/components/journal/BookGate";
import { WriteScreen } from "@/components/write/WriteScreen";

export default function WritePage() {
  return <BookGate>{(journal) => <WriteScreen journal={journal} />}</BookGate>;
}
