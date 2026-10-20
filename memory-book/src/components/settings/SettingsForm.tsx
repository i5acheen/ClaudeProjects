"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { signOut } from "next-auth/react";
import type { Journal, PhotoRef } from "@/lib/types";
import { resizePhoto, type ProcessedPhoto } from "@/lib/images";
import { usePhotoSrc } from "@/components/book/PhotoSource";
import { useJournal } from "@/components/journal/JournalProvider";
import { StylePickers } from "./StylePickers";
import { FamilyCard } from "./FamilyCard";
import { DuplicateCleaner } from "@/components/write/DuplicateCleaner";
import { CoverSheet } from "@/components/book/CoverSheet";
import { InstallApp } from "@/components/app/InstallApp";
import { BackupsCard } from "./BackupsCard";
import { StorageCard } from "./StorageCard";
import { DataCard } from "./DataCard";
import { SiteFooter } from "@/components/legal/SiteFooter";
import { clearDeviceData, revokeGoogleAccess } from "@/lib/device-data";
import {
  coverTheme as currentCoverTheme,
  handwriting as currentHandwriting,
  type CoverTheme,
  type Handwriting,
} from "@/lib/book-style";

type CoverChoice = { kind: "keep" } | { kind: "none" } | { kind: "existing"; ref: PhotoRef } | { kind: "new"; photo: ProcessedPhoto };

export function SettingsForm({ journal }: { journal: Journal }) {
  const router = useRouter();
  const { updateSettings, folderUrl, pendingCount, access } = useJournal();
  const { settings } = journal;
  const [childName, setChildName] = useState(settings.childName);
  const [dateOfBirth, setDateOfBirth] = useState(settings.dateOfBirth);
  const [bookTitle, setBookTitle] = useState(settings.bookTitle);
  const [dedication, setDedication] = useState(settings.dedication ?? "");
  const [cover, setCover] = useState<CoverChoice>({ kind: "keep" });
  const [pickingCover, setPickingCover] = useState(false);
  const [editingCover, setEditingCover] = useState(false);
  const [theme, setTheme] = useState<CoverTheme>(currentCoverTheme(settings));
  const [hand, setHand] = useState<Handwriting>(currentHandwriting(settings));
  const [monthPages, setMonthPages] = useState(settings.monthPages !== false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const allPhotos = journal.memories
    .flatMap((m) => m.photos)
    .filter((p) => !p.fileId.startsWith("local:"));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("Saving…");
    try {
      const coverPhoto =
        cover.kind === "keep" ? settings.coverPhoto : cover.kind === "existing" ? cover.ref : undefined;
      await updateSettings(
        {
          ...settings,
          // A different photo needs its own focus point.
          coverFocus: cover.kind === "keep" ? settings.coverFocus : undefined,
          childName: childName.trim(),
          dateOfBirth,
          bookTitle: bookTitle.trim() || "Memory Book",
          dedication: dedication.trim() || undefined,
          coverPhoto,
          coverTheme: theme,
          handwriting: hand,
          monthPages,
        },
        cover.kind === "new" ? cover.photo : undefined,
      );
      setCover({ kind: "keep" });
      setStatus("Saved ✓");
      router.refresh();
    } catch (err) {
      setStatus(null);
      setError(err instanceof Error ? err.message : "Couldn't save the settings.");
    }
  }

  async function chooseFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      setCover({ kind: "new", photo: await resizePhoto(file) });
      setPickingCover(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That photo couldn't be used.");
    }
  }

  async function handleSignOut() {
    if (pendingCount > 0 && !confirm("Some memories haven't uploaded yet and will be lost if you sign out. Sign out anyway?")) {
      return;
    }
    // Cancel the app's Google access, and clear this device's copies so the next person can't see the book.
    await revokeGoogleAccess();
    await clearDeviceData({ includingDrafts: true });
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="mx-auto max-w-xl px-3 sm:px-4">
      {!access.isOwner && (
        <div className="sheet mb-6 text-lg text-ink-soft">
          <h1 className="ui-h1">{settings.bookTitle}</h1>
          <p className="mt-2">
            This is {access.ownerName ? <b className="text-ink">{access.ownerName}</b> : "a family member"}&rsquo;s book,
            shared with you{access.canEdit ? " — you can add memories too" : ""}. It lives in their Google Drive.
          </p>
        </div>
      )}

      {access.isOwner && (
      <form className="sheet" onSubmit={save}>
        <h1 className="ui-h1">Book settings</h1>

        <label className="field-label mt-6" htmlFor="child-name">
          Child&rsquo;s name
        </label>
        <input id="child-name" className="text-field hand-field" value={childName} onChange={(e) => setChildName(e.target.value)} required maxLength={40} />

        <label className="field-label mt-6" htmlFor="dob">
          Date of birth
        </label>
        <input id="dob" type="date" className="text-field max-w-56" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />

        <label className="field-label mt-6" htmlFor="book-title">
          Book title
        </label>
        <input id="book-title" className="text-field" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} maxLength={40} />

        <label className="field-label mt-6" htmlFor="dedication">
          Note on the first page
        </label>
        <textarea id="dedication" className="ruled-field" rows={3} value={dedication} onChange={(e) => setDedication(e.target.value)} maxLength={300} />

        <StylePickers
          preview={{ ...settings, childName, bookTitle }}
          theme={theme}
          onTheme={setTheme}
          hand={hand}
          onHand={setHand}
        />

        <label className="mt-6 flex items-start gap-3 text-lg text-ink">
          <input type="checkbox" className="mt-1.5 size-4 accent-[var(--accent)]" checked={monthPages} onChange={(e) => setMonthPages(e.target.checked)} />
          <span>
            Month pages
            <span className="block text-sm text-ink-soft">A page at the start of each month (&ldquo;3 months&rdquo;), with height and weight. Rename one from the journal.</span>
          </span>
        </label>

        <p className="field-label mt-6">Cover photo</p>
        <div className="flex flex-wrap items-end gap-4">
          <CoverPreview choice={cover} current={settings.coverPhoto} />
          <div className="flex flex-col gap-2">
            <button type="button" className="chrome-button field-button" onClick={() => setPickingCover((v) => !v)} disabled={allPhotos.length === 0}>
              Choose from the book
            </button>
            <button type="button" className="chrome-button field-button" onClick={() => fileInput.current?.click()}>
              Upload a photo
            </button>
            {(settings.coverPhoto || cover.kind === "new" || cover.kind === "existing") && (
              <button type="button" className="text-left text-sm text-ink-soft underline decoration-dotted" onClick={() => setCover({ kind: "none" })}>
                No cover photo
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => void chooseFile(e.target.files)} />
        </div>
        {settings.coverPhoto && cover.kind === "keep" && (
          <button type="button" className="mt-3 text-ink-soft underline decoration-dotted underline-offset-4" onClick={() => setEditingCover(true)}>
            Move the photo, title label &amp; wording on the cover
          </button>
        )}
        {pickingCover && (
          <div className="cover-photo-grid mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">
            {allPhotos.map((photo) => (
              <CoverOption
                key={photo.fileId}
                photo={photo}
                onPick={() => {
                  setCover({ kind: "existing", ref: photo });
                  setPickingCover(false);
                }}
              />
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button type="submit" className="chrome-button chrome-button--primary !h-12 !px-6 !text-lg" disabled={status === "Saving…"}>
            Save settings
          </button>
          <span className="text-ink-soft" role="status">
            {error ? <span className="text-[var(--ink-terracotta)]">{error}</span> : status}
          </span>
        </div>
      </form>

      )}

      {editingCover && <CoverSheet settings={settings} onClose={() => setEditingCover(false)} onSaved={(s) => setBookTitle(s.bookTitle)} />}

      {access.isOwner && <FamilyCard />}

      {access.isOwner && <BackupsCard />}

      <StorageCard />

      <DataCard />

      <div className="sheet mt-6 space-y-4 text-lg text-ink-soft">
        <h2 className="ui-h2">Your book</h2>
        <InstallApp />
        <p>
          <Link href="/book/export" className="text-ink underline decoration-dotted underline-offset-4">
            Download as a PDF
          </Link>{" "}
          — the whole book or one year, ready to print.
        </p>
        {folderUrl && (
          <p>
            Everything is stored in your Google Drive:{" "}
            <a href={folderUrl} target="_blank" rel="noreferrer" className="text-ink underline decoration-dotted underline-offset-4">
              open the folder
            </a>
            .
          </p>
        )}
        <p>
          <Link href="/book/setup?another=1" className="text-ink underline decoration-dotted underline-offset-4">
            + Start a book for another child
          </Link>{" "}
          — each child gets their own book; switch between them from the top bar.
        </p>
        {access.canEdit && <DuplicateCleaner />}
        <button type="button" className="chrome-button field-button" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
      <SiteFooter className="mb-10" />
    </div>
  );
}

function CoverPreview({ choice, current }: { choice: CoverChoice; current?: PhotoRef }) {
  const ref = choice.kind === "existing" ? choice.ref : choice.kind === "keep" ? current : undefined;
  const remote = usePhotoSrc(ref?.fileId, "thumb");
  const [local] = useState(() => new Map<Blob, string>());
  let src = remote;
  if (choice.kind === "new") {
    src = local.get(choice.photo.blob) ?? URL.createObjectURL(choice.photo.blob);
    local.set(choice.photo.blob, src);
  }
  return (
    <div className="editor-photo w-32">
      <div className="aspect-square overflow-hidden bg-[#e8dfd0]">
        {src && choice.kind !== "none" ? (
          <img src={src} alt="Cover photo" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center font-hand text-lg text-ink-faint">no photo</div>
        )}
      </div>
    </div>
  );
}

function CoverOption({ photo, onPick }: { photo: PhotoRef; onPick: () => void }) {
  const src = usePhotoSrc(photo.fileId, "thumb");
  return (
    <button type="button" onClick={onPick} className="aspect-square overflow-hidden bg-[#e8dfd0] ring-rose hover:ring-2">
      {src && <img src={src} alt="" className="h-full w-full object-cover" />}
    </button>
  );
}
