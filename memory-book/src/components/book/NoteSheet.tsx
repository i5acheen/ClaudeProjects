"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { TAGS, type Journal, type Memory, type PhotoRef, type Tag } from "@/lib/types";
import { ageStamp, isSealed, longDate, parseDay, toDayString } from "@/lib/dates";
import { photoTakenDate, resizePhoto } from "@/lib/images";
import { samePhoto } from "@/lib/photo-hash";
import { seededRandom } from "@/lib/random";
import { tagSlug, writingPrompt } from "@/lib/tags";
import { useJournal, type DraftPhoto } from "@/components/journal/JournalProvider";
import { usePhotoSrc } from "./PhotoSource";

const MAX_PHOTOS = 4;
type PagePhoto = DraftPhoto & { key: string };

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const birthday = (dob: string, years: number) => {
  const d = parseDay(dob);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return toDayString(d);
};

/**
 * Write straight into the journal, on a page: add photos right on it and
 * write on its lines. Used for a new page, for the page you're reading, and
 * for letters to your child — which can be sealed as a time capsule.
 */
export function NoteSheet({
  journal,
  memory,
  letter = false,
  onClose,
  onSaved,
}: {
  journal: Journal;
  /** The page being edited; leave out for a new page. */
  memory?: Memory;
  /** A new letter rather than a new page. */
  letter?: boolean;
  onClose: () => void;
  onSaved: (memoryId: string) => void;
}) {
  const { saveMemory } = useJournal();
  const [photos, setPhotos] = useState<PagePhoto[]>(
    () => memory?.photos.map((ref) => ({ kind: "existing" as const, ref, key: ref.fileId })) ?? [],
  );
  const [tags, setTags] = useState<Tag[]>(memory?.tags ?? []);
  const [processing, setProcessing] = useState(0);
  const [dateTouched, setDateTouched] = useState(!!memory);
  const photoInput = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(memory?.date ?? today());
  const [title, setTitle] = useState(memory?.title ?? "");
  const [text, setText] = useState(memory?.text ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isLetter = memory ? memory.kind === "letter" : letter;
  const [sealedUntil, setSealedUntil] = useState(memory?.sealedUntil ?? "");
  const [sealOn, setSealOn] = useState(!!memory?.sealedUntil);
  const [opened, setOpened] = useState(!isSealed(memory?.sealedUntil));
  const textRef = useRef<HTMLTextAreaElement>(null);
  const name = journal.settings.childName || "little one";
  const dob = journal.settings.dateOfBirth;

  useEffect(() => {
    if (!opened) return;
    const el = textRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, opened]);

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setError(`A page holds up to ${MAX_PHOTOS} photos, so only the first ${room} were added.`);
    // The page takes the day the first photo was taken, unless you set it yourself.
    if (!dateTouched && photos.length === 0 && chosen[0]) {
      const taken = await photoTakenDate(chosen[0]);
      if (taken) setDate(taken);
    }
    const known = [
      ...journal.memories.filter((m) => m.id !== memory?.id).flatMap((m) => m.photos.map((p) => p.hash)),
      ...photos.map((p) => (p.kind === "new" ? p.hash : p.ref.hash)),
    ];
    let repeats = 0;
    setProcessing((n) => n + chosen.length);
    for (const file of chosen) {
      try {
        const processed = await resizePhoto(file);
        if (processed.hash && known.some((h) => samePhoto(h, processed.hash))) {
          repeats++;
          continue;
        }
        known.push(processed.hash);
        setPhotos((list) => [...list, { kind: "new", ...processed, key: newId() }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "That photo couldn't be added.");
      } finally {
        setProcessing((n) => n - 1);
      }
    }
    if (repeats) setError(repeats === 1 ? "That photo is already in the book." : `${repeats} photos are already in the book.`);
  }

  async function save() {
    if (processing) return;
    if (!text.trim() && photos.length === 0) {
      setError("Add a photo or a few words first.");
      return;
    }
    if (isLetter && sealOn && (!sealedUntil || sealedUntil <= date)) {
      setError("Choose a date in the future to seal the letter until.");
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
          tags,
          photos: photos.map(({ key: _key, ...photo }) => photo as DraftPhoto),
          kind: isLetter ? "letter" : memory?.kind,
          sealedUntil: isLetter && sealOn && sealedUntil ? sealedUntil : undefined,
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
    <div className="note-backdrop" role="dialog" aria-modal aria-label={memory ? "Edit this page" : isLetter ? `Write a letter to ${name}` : "New page"} onClick={onClose}>
      <div className="note-sheet note-sheet--page" onClick={(e) => e.stopPropagation()}>
        {!opened ? (
          <div className="py-6 text-center text-lg text-ink-soft">
            <p className="ui-h2">This letter is sealed</p>
            <p className="mt-2">It opens on {longDate(memory!.sealedUntil!)}. Open it now anyway?</p>
            <div className="mt-5 flex justify-center gap-3">
              <button type="button" className="chrome-button field-button" onClick={() => setOpened(true)}>
                Open it
              </button>
              <button type="button" className="chrome-button" onClick={onClose}>
                Keep it sealed
              </button>
            </div>
          </div>
        ) : (
        <>
        {isLetter ? (
          <p className="letter-eyebrow !text-lg">A letter to {name}</p>
        ) : (
          !memory && <p className="page-sheet__eyebrow">New page</p>
        )}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <input type="date" aria-label="Date" className="text-field !w-auto !text-base" value={date} onChange={(e) => {
              setDate(e.target.value);
              setDateTouched(true);
            }} />
          <span className="text-base text-[var(--ink-terracotta)] italic">{ageStamp(journal.settings.dateOfBirth, date)}</span>
        </div>
        <p className="mt-1 text-xs tracking-[0.16em] text-ink-faint uppercase">{date && longDate(date)}</p>

        <input
          className="text-field hand-field mt-4"
          placeholder="A title (optional)"
          aria-label="Title"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
        />
        {!isLetter && (
          <div className="page-photos" aria-label="Photos on this page">
            {photos.map((photo) => (
              <PagePhotoTile key={photo.key} photo={photo} onRemove={() => setPhotos((list) => list.filter((p) => p.key !== photo.key))} />
            ))}
            {Array.from({ length: processing }, (_, i) => (
              <div key={`processing-${i}`} className="page-photo page-photo--busy">
                <span>…</span>
              </div>
            ))}
            {photos.length + processing < MAX_PHOTOS && (
              <button type="button" className="page-photo-add" onClick={() => photoInput.current?.click()}>
                <span className="text-2xl leading-none">+</span>
                <span>{photos.length ? "Add more" : "Add photos"}</span>
              </button>
            )}
            <input ref={photoInput} type="file" accept="image/*" multiple hidden onChange={(e) => {
              void addPhotos(e.target.files);
              e.target.value = "";
            }} />
          </div>
        )}
        <textarea
          ref={textRef}
          className="ruled-field note-sheet__text mt-2"
          aria-label="Your words"
          placeholder={isLetter ? `Dear ${name}, on your first birthday…` : writingPrompt(tags, name)}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {!isLetter && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={tags.includes(tag)}
                onClick={() => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]))}
                className={`tag-toggle !px-2.5 !py-1 !text-[0.72rem] tag-stamp--${tagSlug(tag)}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {isLetter && (
          <div className="mt-4 rounded-xl bg-white/70 p-3 text-ink-soft">
            <label className="flex items-center gap-2 text-ink">
              <input type="checkbox" className="size-4 accent-[var(--accent)]" checked={sealOn} onChange={(e) => setSealOn(e.target.checked)} />
              Seal it as a time capsule
            </label>
            {sealOn && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                {[10, 16, 18].map((years) => (
                  <button
                    key={years}
                    type="button"
                    className={`chrome-button field-button !h-8 !px-3 !text-sm ${sealedUntil === birthday(dob, years) ? "!border-[var(--accent)] !bg-[var(--accent-soft)]" : ""}`}
                    onClick={() => setSealedUntil(birthday(dob, years))}
                  >
                    {years}th birthday
                  </button>
                ))}
                <input
                  type="date"
                  aria-label="Sealed until"
                  className="text-field !w-auto !text-sm"
                  value={sealedUntil}
                  onChange={(e) => setSealedUntil(e.target.value)}
                />
                {sealedUntil && <span className="w-full italic">It will stay sealed in the book until {longDate(sealedUntil)}.</span>}
              </div>
            )}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className="chrome-button chrome-button--primary !h-11 !px-6" onClick={save} disabled={status !== null || processing > 0}>
            {status ?? (processing ? "Preparing photos…" : memory ? "Save page" : isLetter ? "Add letter to journal" : "Add page to journal")}
          </button>
          <button type="button" className="chrome-button" onClick={onClose}>
            Cancel
          </button>
          <span className="flex-1" />
          {memory && (
            <Link href={`/book/edit/${encodeURIComponent(memory.id)}`} className="text-sm text-ink-soft underline decoration-dotted underline-offset-4">
              more options
            </Link>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-[var(--ink-terracotta)]">{error}</p>}
        </>
        )}
      </div>
    </div>
  );
}

function PagePhotoTile({ photo, onRemove }: { photo: PagePhoto; onRemove: () => void }) {
  const remote = usePhotoSrc(photo.kind === "existing" ? photo.ref.fileId : undefined, "thumb");
  const [local, setLocal] = useState<string>();
  useEffect(() => {
    if (photo.kind !== "new") return;
    const url = URL.createObjectURL(photo.blob);
    setLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  const src = local ?? remote;
  const ref: Pick<PhotoRef, "width" | "height"> = photo.kind === "new" ? photo : photo.ref;
  return (
    <div className="page-photo" style={{ transform: `rotate(${seededRandom(photo.key).range(-3, 3)}deg)` }}>
      <div className="page-photo__img" style={{ aspectRatio: Math.min(1.4, Math.max(0.75, ref.width / ref.height)) }}>
        {src && <img src={src} alt="" />}
      </div>
      <button type="button" className="page-photo__remove" onClick={onRemove} aria-label="Take this photo off the page">
        ×
      </button>
    </div>
  );
}
