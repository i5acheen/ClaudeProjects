"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Journal, Memory } from "@/lib/types";
import { ageStamp, longDate } from "@/lib/dates";
import { useJournal } from "@/components/journal/JournalProvider";

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

/**
 * Write straight into the journal: edit the words of the page you're
 * reading, or add a words-only note. Photos and tags stay as they are.
 */
export function NoteSheet({
  journal,
  memory,
  onClose,
  onSaved,
}: {
  journal: Journal;
  /** The page being edited; leave out for a new note. */
  memory?: Memory;
  onClose: () => void;
  onSaved: (memoryId: string) => void;
}) {
  const { saveMemory } = useJournal();
  const [date, setDate] = useState(memory?.date ?? today());
  const [title, setTitle] = useState(memory?.title ?? "");
  const [text, setText] = useState(memory?.text ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    if (!text.trim() && !memory?.photos.length) {
      setError("Write a few words first.");
      return;
    }
    const id = memory?.id ?? newId();
    setError(null);
    setStatus("Saving…");
    try {
      await saveMemory(
        {
          id,
          date,
          title: title.trim() || undefined,
          text: text.trim(),
          tags: memory?.tags ?? [],
          photos: (memory?.photos ?? []).map((ref) => ({ kind: "existing", ref })),
        },
        setStatus,
      );
      onSaved(id);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  return (
    <div className="note-backdrop" role="dialog" aria-modal aria-label={memory ? "Edit this page" : "Write a note"} onClick={onClose}>
      <div className="note-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <input type="date" aria-label="Date" className="text-field !w-auto !text-base" value={date} onChange={(e) => setDate(e.target.value)} />
          <span className="font-serif text-base text-[var(--ink-terracotta)] italic">{ageStamp(journal.settings.dateOfBirth, date)}</span>
        </div>
        <p className="mt-1 font-serif text-xs tracking-[0.16em] text-ink-faint uppercase">{date && longDate(date)}</p>

        <input
          className="text-field hand-field mt-4"
          placeholder="A title (optional)"
          aria-label="Title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          ref={textRef}
          className="ruled-field note-sheet__text mt-2"
          aria-label="Your words"
          placeholder={`Dear ${journal.settings.childName || "little one"}, …`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null}>
            {status ?? (memory ? "Save page" : "Add to journal")}
          </button>
          <button type="button" className="chrome-button" onClick={onClose}>
            Cancel
          </button>
          <span className="flex-1" />
          {memory && (
            <Link href={`/book/edit/${encodeURIComponent(memory.id)}`} className="font-serif text-sm text-ink-soft underline decoration-dotted underline-offset-4">
              photos & tags
            </Link>
          )}
        </div>
        {error && <p className="mt-2 font-serif text-sm text-[var(--ink-terracotta)]">{error}</p>}
      </div>
    </div>
  );
}
