"use client";

import Link from "next/link";
import { BackButton } from "@/components/ui/BackButton";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TAGS, type Journal, type Memory, type Tag } from "@/lib/types";
import { ageStamp, toDayString } from "@/lib/dates";
import { photoTakenDate, resizePhoto } from "@/lib/images";
import { samePhoto } from "@/lib/photo-hash";
import { TAG_META, tagSlug, writingPrompt } from "@/lib/tags";
import { usePhotoSrc } from "@/components/book/PhotoSource";
import { useJournal, type DraftPhoto } from "@/components/journal/JournalProvider";

const MAX_PHOTOS = 4;
const NEW_DRAFT_KEY = "memory-book:new-memory-draft";

type EditorPhoto = DraftPhoto & { key: string };

interface TextDraft {
  date: string;
  title: string;
  text: string;
  tags: Tag[];
}

const today = () => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

interface MemoryEditorProps {
  journal: Journal;
  memory?: Memory;
  /**
   * "page": a full screen with a save bar fixed to the bottom (editing).
   * "inline": a card on the Write page that clears itself after saving.
   */
  variant?: "page" | "inline";
}

export function MemoryEditor({ journal, memory, variant = "page" }: MemoryEditorProps) {
  const router = useRouter();
  const { saveMemory, deleteMemory } = useJournal();
  const isNew = !memory;
  const inline = variant === "inline";
  const [memoryId, setMemoryId] = useState(() => memory?.id ?? newId());
  const [savedId, setSavedId] = useState<string | null>(null);

  const [photos, setPhotos] = useState<EditorPhoto[]>(
    () => memory?.photos.map((ref) => ({ kind: "existing" as const, ref, key: ref.fileId })) ?? [],
  );
  const [date, setDate] = useState(memory?.date ?? today());
  const [dateFromPhoto, setDateFromPhoto] = useState(false);
  const [dateTouched, setDateTouched] = useState(!isNew);
  const [title, setTitle] = useState(memory?.title ?? "");
  const [text, setText] = useState(memory?.text ?? "");
  const [tags, setTags] = useState<Tag[]>(memory?.tags ?? []);
  const [processing, setProcessing] = useState(0);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [keptOffline, setKeptOffline] = useState(false);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const saving = progress !== null;

  // Keep the words of an unsaved new memory, in case the page is closed by accident.
  useEffect(() => {
    if (!isNew) return;
    try {
      const saved = localStorage.getItem(NEW_DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as TextDraft;
        setDate(draft.date || today());
        setTitle(draft.title);
        setText(draft.text);
        setTags(draft.tags);
        if (draft.date) setDateTouched(true);
      }
    } catch {
      // ignore
    }
  }, [isNew]);

  useEffect(() => {
    if (!isNew) return;
    try {
      if (title || text) localStorage.setItem(NEW_DRAFT_KEY, JSON.stringify({ date, title, text, tags }));
    } catch {
      // ignore
    }
  }, [isNew, date, title, text, tags]);

  /* ---------------- photos ---------------- */

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(files).slice(0, room);
    if (files.length > room) setError(`A page holds up to ${MAX_PHOTOS} photos, so only the first ${room} were added.`);

    // Use the first photo's "taken on" date, unless the date was already set by hand.
    if (!dateTouched && photos.length === 0 && chosen[0]) {
      const taken = await photoTakenDate(chosen[0]);
      if (taken) {
        setDate(taken);
        setDateFromPhoto(true);
      }
    }

    setProcessing((n) => n + chosen.length);
    const known = [
      ...journal.memories.flatMap((m) => m.photos.map((p) => p.hash)),
      ...photos.map((p) => (p.kind === "new" ? p.hash : p.ref.hash)),
    ];
    let repeats = 0;
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
    if (repeats) {
      setError(
        repeats === 1
          ? "That photo is already in the book, so it wasn't added again."
          : `${repeats} photos are already in the book, so they weren't added again.`,
      );
    }
  }

  const removePhoto = (key: string) => setPhotos((list) => list.filter((p) => p.key !== key));
  const moveFirst = (key: string) =>
    setPhotos((list) => {
      const photo = list.find((p) => p.key === key);
      return photo ? [photo, ...list.filter((p) => p.key !== key)] : list;
    });

  /* ---------------- save / delete ---------------- */

  async function save() {
    if (!text.trim() && photos.length === 0) {
      setError("Add a photo or a few words first.");
      return;
    }
    setError(null);
    setProgress("Saving…");
    try {
      const result = await saveMemory(
        {
          id: memoryId,
          date,
          title: title.trim() || undefined,
          text: text.trim(),
          tags,
          photos: photos.map(({ key: _key, ...photo }) => photo as DraftPhoto),
          kind: memory?.kind,
          sealedUntil: memory?.sealedUntil,
          paper: memory?.paper,
          pageStyle: memory?.pageStyle,
        },
        setProgress,
      );
      if (isNew) localStorage.removeItem(NEW_DRAFT_KEY);
      if (inline) {
        // Clear the card for the next memory.
        setSavedId(memoryId);
        setMemoryId(newId());
        setPhotos([]);
        setTitle("");
        setText("");
        setTags([]);
        setDate(today());
        setDateTouched(false);
        setDateFromPhoto(false);
        setProgress(null);
        return;
      }
      if (result === "queued") {
        setProgress("Saved on this device — it will upload when you're back online.");
        // Without a connection the book page can't load yet, so stay here.
        if (!navigator.onLine) {
          setKeptOffline(true);
          return;
        }
        await new Promise((r) => setTimeout(r, 1600));
      }
      router.push(`/book?memory=${encodeURIComponent(memoryId)}`);
    } catch (e) {
      setProgress(null);
      setError(
        `${e instanceof Error ? e.message : "Saving failed."} Your memory is kept on this device and will be retried.`,
      );
    }
  }

  async function remove() {
    setProgress("Deleting…");
    try {
      await deleteMemory(memoryId);
      router.push("/book");
    } catch (e) {
      setProgress(null);
      setError(e instanceof Error ? e.message : "Couldn't delete this memory.");
    }
  }

  const toggleTag = (tag: Tag) => setTags((list) => (list.includes(tag) ? list.filter((t) => t !== tag) : [...list, tag]));

  /* ---------------- view ---------------- */

  const saveControls = (
    <>
      <p className="min-w-0 flex-1 text-sm text-ink-soft" role="status" aria-live="polite">
        {error ? (
          <span className="text-[var(--ink-terracotta)]">{error}</span>
        ) : progress ? (
          progress
        ) : savedId ? (
          <>
            Saved ✓{" "}
            <Link href={`/book?memory=${encodeURIComponent(savedId)}`} className="underline decoration-dotted underline-offset-4">
              see it in the journal
            </Link>
          </>
        ) : null}
      </p>
      {keptOffline ? (
        <Link href="/book" className="chrome-button chrome-button--primary !h-12 shrink-0 !px-6 !text-lg">
          Back to the book
        </Link>
      ) : (
        <button
          type="button"
          className="chrome-button chrome-button--primary !h-12 shrink-0 !px-6 !text-lg"
          onClick={save}
          disabled={saving || processing > 0}
        >
          {saving ? "Saving…" : isNew ? "Save to book" : "Save changes"}
        </button>
      )}
    </>
  );

  const sheet = (
        <div className="sheet">
          <h1 className="ui-h1">
            {inline ? "Write a new memory" : isNew ? "A new memory" : "Edit memory"}
          </h1>

          {/* Photos */}
          <section className="mt-5" aria-label="Photos">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {photos.map((photo, i) => (
                <PhotoTile
                  key={photo.key}
                  photo={photo}
                  index={i}
                  onRemove={() => removePhoto(photo.key)}
                  onMoveFirst={i > 0 ? () => moveFirst(photo.key) : undefined}
                />
              ))}
              {Array.from({ length: processing }, (_, i) => (
                <div key={`processing-${i}`} className="editor-photo grid place-items-center font-hand text-lg text-ink-soft">
                  preparing…
                </div>
              ))}
            </div>
            {photos.length + processing < MAX_PHOTOS && (
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" className="chrome-button field-button" onClick={() => cameraInput.current?.click()}>
                  <span aria-hidden>📷</span> Take a photo
                </button>
                <button type="button" className="chrome-button field-button" onClick={() => galleryInput.current?.click()}>
                  <span aria-hidden>🖼</span> Choose photos
                </button>
                <span className="self-center text-sm text-ink-faint italic">up to {MAX_PHOTOS}</span>
              </div>
            )}
            <input
              ref={cameraInput}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </section>

          {/* Date */}
          <section className="mt-7">
            <label className="field-label" htmlFor="memory-date">
              Date
            </label>
            <input
              id="memory-date"
              type="date"
              className="text-field max-w-56"
              value={date}
              max={toDayString(new Date(Date.now() + 86_400_000))}
              onChange={(e) => {
                setDate(e.target.value);
                setDateTouched(true);
                setDateFromPhoto(false);
              }}
              required
            />
            {date && (
              <p className="mt-2 text-lg text-[var(--ink-terracotta)] italic">
                {ageStamp(journal.settings.dateOfBirth, date)}
                {dateFromPhoto && <span className="ml-2 text-sm text-ink-faint not-italic">· taken from the photo</span>}
              </p>
            )}
          </section>

          {/* Title */}
          <section className="mt-6">
            <label className="field-label" htmlFor="memory-title">
              Title <span className="font-normal normal-case italic tracking-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="memory-title"
              className="text-field hand-field"
              placeholder="Your first smile"
              value={title}
              maxLength={80}
              onChange={(e) => setTitle(e.target.value)}
            />
          </section>

          {/* Text */}
          <section className="mt-6">
            <label className="field-label" htmlFor="memory-text">
              The memory
            </label>
            <textarea
              id="memory-text"
              className="ruled-field"
              placeholder={writingPrompt(tags, journal.settings.childName)}
              value={text}
              rows={7}
              onChange={(e) => setText(e.target.value)}
            />
          </section>

          {/* Tags */}
          <section className="mt-6">
            <p className="field-label">Tags</p>
            {(["moments", "ceremonies"] as const).map((group) => (
              <div key={group} className={group === "ceremonies" ? "mt-3" : ""}>
                {group === "ceremonies" && (
                  <p className="mb-1.5 text-sm text-ink-faint italic">Milestones &amp; ceremonies</p>
                )}
                <div className="flex flex-wrap gap-2.5">
                  {TAGS.filter((tag) => TAG_META[tag].group === group).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      aria-pressed={tags.includes(tag)}
                      onClick={() => toggleTag(tag)}
                      className={`tag-toggle tag-stamp--${tagSlug(tag)}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {!isNew && (
            <section className="mt-10 border-t border-dashed border-ink-faint/50 pt-5">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-3 text-ink-soft">
                  <span>Delete this memory and its photos?</span>
                  <button type="button" className="chrome-button danger-button" onClick={remove} disabled={saving}>
                    Yes, delete
                  </button>
                  <button type="button" className="chrome-button" onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </button>
                </div>
              ) : (
                <button type="button" className="text-[var(--ink-terracotta)] underline decoration-dotted underline-offset-4" onClick={() => setConfirmDelete(true)}>
                  Delete this memory
                </button>
              )}
            </section>
          )}

          {inline && <div className="mt-8 flex items-center justify-between gap-3">{saveControls}</div>}
        </div>
  );

  if (inline) return sheet;

  return (
    <main className="min-h-dvh pb-28">
      <header className="flex h-14 items-center justify-between px-4">
        <BackButton
          fallback={memory ? `/book?memory=${encodeURIComponent(memory.id)}` : "/book/write"}
          label={memory ? "Back to the journal" : "Back"}
        />
      </header>

      <div className="mx-auto max-w-xl px-3 sm:px-4">{sheet}</div>

      {/* Save bar — stays at the bottom on phones */}
      <div className="save-bar">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4">{saveControls}</div>
      </div>
    </main>
  );
}

function PhotoTile({
  photo,
  index,
  onRemove,
  onMoveFirst,
}: {
  photo: EditorPhoto;
  index: number;
  onRemove: () => void;
  onMoveFirst?: () => void;
}) {
  const remote = usePhotoSrc(photo.kind === "existing" ? photo.ref.fileId : undefined, "thumb");
  const [local, setLocal] = useState<string>();

  useEffect(() => {
    if (photo.kind !== "new") return;
    const url = URL.createObjectURL(photo.blob);
    setLocal(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const src = photo.kind === "new" ? local : remote;
  return (
    <div className="editor-photo group" style={{ transform: `rotate(${index % 2 ? 1.2 : -1.4}deg)` }}>
      <div className="aspect-square overflow-hidden bg-[#e8dfd0]">
        {src && <img src={src} alt="" className="h-full w-full object-cover" />}
      </div>
      <button type="button" className="editor-photo__remove" onClick={onRemove} aria-label="Remove photo">
        ×
      </button>
      {onMoveFirst && (
        <button type="button" className="editor-photo__first" onClick={onMoveFirst} title="Make this the main photo">
          ★ main
        </button>
      )}
    </div>
  );
}
