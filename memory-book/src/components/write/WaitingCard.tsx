"use client";

import Link from "next/link";
import { useState } from "react";
import { TAGS, type Memory, type PhotoRef, type Tag } from "@/lib/types";
import { ageStamp, longDate } from "@/lib/dates";
import { seededRandom } from "@/lib/random";
import { tagSlug, writingPrompt } from "@/lib/tags";
import { usePhotoSrc } from "@/components/book/PhotoSource";
import { useJournal } from "@/components/journal/JournalProvider";

/**
 * A memory that has photos but no words yet — usually photos that arrived
 * from your Drive folder. Write a few lines right here and save.
 */
export function WaitingCard({ memory, dateOfBirth, childName }: { memory: Memory; dateOfBirth: string; childName: string }) {
  const { saveMemory, deleteMemory } = useJournal();
  const [date, setDate] = useState(memory.date);
  const [title, setTitle] = useState(memory.title ?? "");
  const [text, setText] = useState("");
  const [tags, setTags] = useState<Tag[]>(memory.tags);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const busy = status !== null;

  async function save() {
    if (!text.trim()) {
      setError("Write a few words first.");
      return;
    }
    setError(null);
    setStatus("Saving…");
    try {
      await saveMemory(
        {
          id: memory.id,
          date,
          title: title.trim() || undefined,
          text: text.trim(),
          tags,
          photos: memory.photos.map((ref) => ({ kind: "existing", ref })),
        },
        setStatus,
      );
      // The card disappears from "waiting" once it has words.
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't save.");
    }
  }

  async function remove() {
    setStatus("Removing…");
    try {
      await deleteMemory(memory.id);
    } catch (e) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Couldn't remove.");
    }
  }

  return (
    <article className="sheet waiting-card">
      <div className="flex flex-wrap gap-3">
        {memory.photos.map((photo, i) => (
          <Thumb key={photo.fileId} photo={photo} tilt={seededRandom(photo.fileId).range(-2.5, 2.5)} big={memory.photos.length === 1 && i === 0} />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <input
          type="date"
          aria-label="Date"
          className="text-field !w-auto !text-base"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <span className="font-serif text-base text-[var(--ink-terracotta)] italic">{ageStamp(dateOfBirth, date)}</span>
      </div>
      <p className="mt-1 font-serif text-xs tracking-[0.14em] text-ink-faint uppercase">{longDate(date)}</p>
      {memory.dateGuessed && date === memory.date && (
        <p className="mt-1 font-serif text-sm text-[var(--ink-terracotta)]">
          We couldn&rsquo;t find when {memory.photos.length === 1 ? "this photo was" : "these photos were"} taken, so this is
          the day {memory.photos.length === 1 ? "it was" : "they were"} added — please check the date.
        </p>
      )}

      <input
        className="text-field hand-field mt-3"
        placeholder="A title (optional)"
        aria-label="Title"
        value={title}
        maxLength={80}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="ruled-field mt-2"
        rows={4}
        aria-label="The memory"
        placeholder={writingPrompt(tags, childName)}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            aria-pressed={tags.includes(tag)}
            onClick={() => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))}
            className={`tag-toggle !text-[0.7rem] tag-stamp--${tagSlug(tag)}`}
          >
            {tag}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="button" className="chrome-button chrome-button--primary !h-11 !px-5" onClick={save} disabled={busy}>
          {busy ? status : "Save to book"}
        </button>
        <Link href={`/book/edit/${encodeURIComponent(memory.id)}`} className="font-serif text-ink-soft underline decoration-dotted underline-offset-4">
          Edit details
        </Link>
        <span className="flex-1" />
        {confirmRemove ? (
          <span className="flex items-center gap-2 font-serif text-sm text-ink-soft">
            {memory.photos.length === 1 ? "Take this photo out of the book?" : "Take these photos out of the book?"} Your originals stay in Drive.
            <button type="button" className="chrome-button danger-button !h-9 !px-3 !text-sm" onClick={remove} disabled={busy}>
              Yes
            </button>
            <button type="button" className="chrome-button !h-9 !px-3 !text-sm" onClick={() => setConfirmRemove(false)}>
              No
            </button>
          </span>
        ) : (
          <button type="button" className="font-serif text-sm text-ink-faint underline decoration-dotted underline-offset-4" onClick={() => setConfirmRemove(true)}>
            {memory.photos.length === 1 ? "Skip this photo" : "Skip these photos"}
          </button>
        )}
      </div>
      {error && <p className="mt-2 font-serif text-sm text-[var(--ink-terracotta)]">{error}</p>}
    </article>
  );
}

function Thumb({ photo, tilt, big }: { photo: PhotoRef; tilt: number; big: boolean }) {
  const src = usePhotoSrc(photo.fileId, "thumb");
  return (
    <div className={`editor-photo !aspect-auto ${big ? "w-48" : "w-28"}`} style={{ transform: `rotate(${tilt}deg)` }}>
      <div className="overflow-hidden bg-[#e8dfd0]" style={{ aspectRatio: Math.min(1.5, Math.max(0.7, photo.width / photo.height)) }}>
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </div>
    </div>
  );
}
