"use client";

import { useEffect, useState } from "react";
import type { WatchedFolder } from "@/lib/types";
import { listFolders, type DriveFile } from "@/lib/drive/client";
import { DROP_FOLDER_NAME } from "@/lib/drive/drive-repository";
import { FolderIcon } from "@/components/ui/Icons";
import { useJournal } from "@/components/journal/JournalProvider";

const RETURN_TO = "/book/write?choose-folder=1";

function timeAgo(iso?: string): string {
  if (!iso) return "not yet";
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

/** Connect a Google Drive folder: photos you put there become memories waiting for words. */
export function DriveFolderCard({ watched, openChooser }: { watched?: WatchedFolder; openChooser?: boolean }) {
  const { folderWatch, requestFolderPermission, watchFolder, stopWatchingFolder, checkFolderNow } = useJournal();
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Coming back from Google after allowing access: go straight to choosing a folder.
  useEffect(() => {
    if (openChooser && folderWatch.canRead && !watched) setChoosing(true);
  }, [openChooser, folderWatch.canRead, watched]);

  async function choose(folder: { id: string; name: string } | null) {
    setChoosing(false);
    setBusy(true);
    setError(null);
    try {
      await watchFolder(folder);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't connect the folder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="sheet">
      <div className="flex items-start gap-3">
        <span className="mt-1 text-ink-soft">
          <FolderIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-hand text-3xl font-bold text-ink">Photos from Google Drive</h2>

          {!watched ? (
            <>
              <p className="mt-1 font-serif text-lg text-ink-soft">
                Connect a folder in your Drive. Any photo you put there — from your phone&rsquo;s Drive app, your
                computer, or a family member — shows up here by itself, ready for you to write about.
              </p>
              {folderWatch.canRead ? (
                <button type="button" className="chrome-button chrome-button--primary mt-4" onClick={() => setChoosing(true)} disabled={busy}>
                  {busy ? "Connecting…" : "Choose a folder"}
                </button>
              ) : (
                <>
                  <button type="button" className="chrome-button chrome-button--primary mt-4" onClick={() => requestFolderPermission(RETURN_TO)}>
                    Connect a Drive folder
                  </button>
                  <p className="mt-3 font-serif text-sm text-ink-faint italic">
                    Google will ask you to let Memory Book <b>read</b> your Drive, so it can see the photos you add to the
                    folder. It only ever looks in the folder you choose, never changes your photos, and nothing leaves
                    your Drive and your browser.
                  </p>
                </>
              )}
            </>
          ) : (
            <>
              <p className="mt-1 font-serif text-lg text-ink">
                Watching{" "}
                <a
                  href={`https://drive.google.com/drive/folders/${watched.folderId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted underline-offset-4"
                >
                  {watched.folderName || "your folder"}
                </a>
              </p>
              <p className="mt-1 font-serif text-sm text-ink-soft" role="status" aria-live="polite">
                {folderWatch.status === "checking"
                  ? folderWatch.progress && folderWatch.progress.total > 0
                    ? `Bringing in photos… ${folderWatch.progress.done} of ${folderWatch.progress.total}`
                    : "Checking for new photos…"
                  : folderWatch.status === "needs-permission"
                    ? "Memory Book needs your OK to read this folder on this account."
                    : `Checked ${timeAgo(watched.lastCheckedAt)} · ${watched.importedFileIds.length} photo${watched.importedFileIds.length === 1 ? "" : "s"} brought in so far${folderWatch.lastAdded ? ` · ${folderWatch.lastAdded} new` : ""}`}
              </p>
              {folderWatch.message && <p className="mt-1 font-serif text-sm text-[var(--ink-terracotta)]">{folderWatch.message}</p>}

              <div className="mt-4 flex flex-wrap gap-2">
                {folderWatch.status === "needs-permission" ? (
                  <button type="button" className="chrome-button chrome-button--primary" onClick={() => requestFolderPermission("/book/write")}>
                    Allow reading the folder
                  </button>
                ) : (
                  <button type="button" className="chrome-button field-button" onClick={() => checkFolderNow()} disabled={folderWatch.status === "checking"}>
                    Check now
                  </button>
                )}
                {folderWatch.canRead && (
                  <button type="button" className="chrome-button field-button" onClick={() => setChoosing(true)}>
                    Change folder
                  </button>
                )}
                <button type="button" className="chrome-button field-button" onClick={() => stopWatchingFolder()}>
                  Stop watching
                </button>
              </div>
              <p className="mt-3 font-serif text-sm text-ink-faint italic">
                Photos are copied into your book (resized) — the originals in the folder are never changed. New photos
                are checked whenever Memory Book is open.
              </p>
            </>
          )}
          {error && <p className="mt-2 font-serif text-[var(--ink-terracotta)]">{error}</p>}
        </div>
      </div>

      {choosing && <FolderChooser onChoose={choose} onClose={() => setChoosing(false)} />}
    </section>
  );
}

/** A small Drive folder browser. */
function FolderChooser({ onChoose, onClose }: { onChoose: (folder: { id: string; name: string } | null) => void; onClose: () => void }) {
  const [path, setPath] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const current = path.at(-1);

  useEffect(() => {
    let cancelled = false;
    setFolders(null);
    listFolders(current?.id ?? "root")
      .then((list) => !cancelled && setFolders(list))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Couldn't list your folders."));
    return () => {
      cancelled = true;
    };
  }, [current?.id]);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center" role="dialog" aria-modal aria-label="Choose a folder">
      <div className="sheet max-h-[85dvh] w-full max-w-lg overflow-y-auto !rounded-b-none sm:!rounded-b-[0.35rem]">
        <div className="flex items-center justify-between">
          <h3 className="font-hand text-3xl font-bold text-ink">Choose a folder</h3>
          <button type="button" className="chrome-button !px-3" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <button type="button" className="folder-option mt-4 w-full" onClick={() => onChoose(null)}>
          <span className="font-serif text-lg font-semibold text-ink">✨ Make a new “{DROP_FOLDER_NAME}” folder</span>
          <span className="block font-serif text-sm text-ink-soft">Inside your Memory Book folder — the simplest choice.</span>
        </button>

        <p className="field-label mt-6">Or pick an existing folder</p>
        <div className="flex flex-wrap items-center gap-1 font-serif text-ink-soft">
          <button type="button" className="underline decoration-dotted underline-offset-4" onClick={() => setPath([])}>
            My Drive
          </button>
          {path.map((f, i) => (
            <span key={f.id}>
              {" › "}
              <button type="button" className="underline decoration-dotted underline-offset-4" onClick={() => setPath(path.slice(0, i + 1))}>
                {f.name}
              </button>
            </span>
          ))}
        </div>

        <ul className="mt-2 divide-y divide-[rgba(134,112,95,0.15)]">
          {folders === null && !error && <li className="py-3 font-serif text-ink-faint">Loading…</li>}
          {folders?.length === 0 && <li className="py-3 font-serif text-ink-faint italic">No folders inside.</li>}
          {folders?.map((folder) => (
            <li key={folder.id}>
              <button type="button" className="flex w-full items-center gap-2 py-2.5 text-left font-serif text-lg text-ink hover:text-[var(--cloth)]" onClick={() => setPath([...path, folder])}>
                <FolderIcon /> {folder.name}
              </button>
            </li>
          ))}
        </ul>
        {error && <p className="mt-2 font-serif text-[var(--ink-terracotta)]">{error}</p>}

        {current && (
          <button type="button" className="chrome-button chrome-button--primary mt-5 w-full justify-center" onClick={() => onChoose({ id: current.id, name: current.name })}>
            Watch “{current.name}”
          </button>
        )}
      </div>
    </div>
  );
}
