"use client";

/**
 * Google's own file picker. With the small `drive.file` permission, the app
 * can only see files it made itself — or files you pick here, in Google's
 * window. Picking a photo gives the app access to that photo and nothing else.
 *
 * Needs two public values from Google Cloud (see PRODUCTION_CHECKLIST.md):
 * NEXT_PUBLIC_GOOGLE_PICKER_API_KEY (restricted to this website and the
 * Picker API) and NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER.
 */

export interface PickedFile {
  id: string;
  name: string;
  mimeType: string;
  parentId?: string;
}

export interface PickOptions {
  /** "photos": images, many at once. "book": a shared Memory Book folder. */
  kind: "photos" | "book";
  /** Open in this folder (e.g. the one you picked from last time). */
  folderId?: string;
  title?: string;
}

declare global {
  interface Window {
    /** Automated tests replace Google's window with this. */
    __memoryBookPicker?: (options: PickOptions) => Promise<PickedFile[]>;
    gapi?: { load(name: string, options: { callback: () => void; onerror: () => void }): void };
    // Google's picker library has no published types.
    google?: { picker: any };
  }
}

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY ?? "";
const PROJECT_NUMBER = process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER ?? "";

export const pickerConfigured = () =>
  (typeof window !== "undefined" && !!window.__memoryBookPicker) || (!!API_KEY && !!PROJECT_NUMBER);

let loading: Promise<void> | null = null;

function loadPickerLibrary(): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const ready = () =>
      window.gapi!.load("picker", { callback: () => resolve(), onerror: () => reject(new Error("Google's picker couldn't load.")) });
    if (window.gapi) return ready();
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Google's picker couldn't load. Check your connection and try again."));
    document.head.appendChild(script);
  }).catch((e) => {
    loading = null;
    throw e;
  });
  return loading;
}

/** Opens Google's picker; resolves with what was picked (empty if cancelled). */
export async function pickFromDrive(accessToken: string, options: PickOptions): Promise<PickedFile[]> {
  if (window.__memoryBookPicker) return window.__memoryBookPicker(options);
  if (!pickerConfigured()) throw new Error("Choosing from Google Drive isn't set up on this website yet.");
  await loadPickerLibrary();
  const { picker } = window.google!;

  const view =
    options.kind === "photos"
      ? new picker.DocsView(picker.ViewId.DOCS_IMAGES).setIncludeFolders(true)
      : new picker.DocsView(picker.ViewId.FOLDERS).setIncludeFolders(true).setSelectFolderEnabled(true).setOwnedByMe(false);
  if (options.folderId) view.setParent(options.folderId);

  return new Promise((resolve) => {
    const builder = new picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(API_KEY)
      .setAppId(PROJECT_NUMBER)
      .setOrigin(window.location.origin)
      .setTitle(options.title ?? (options.kind === "photos" ? "Choose photos for the book" : "Choose the shared Memory Book"))
      .setCallback((data: any) => {
        if (data.action === picker.Action.PICKED)
          resolve(
            (data.docs ?? []).map((d: any) => ({ id: d.id, name: d.name, mimeType: d.mimeType, parentId: d.parentId })),
          );
        else if (data.action === picker.Action.CANCEL) resolve([]);
      });
    if (options.kind === "photos") builder.enableFeature(picker.Feature.MULTISELECT_ENABLED);
    builder.build().setVisible(true);
  });
}
