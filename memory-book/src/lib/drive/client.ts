/**
 * Low-level Google Drive v3 calls, made straight from the browser with the
 * signed-in user's access token (so photos never pass through our server).
 */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export class SignedOutError extends Error {
  constructor() {
    super("Your Google sign-in has expired. Please sign in again.");
  }
}

export class OfflineError extends Error {
  constructor() {
    super("You seem to be offline. Your memory is saved on this device and will upload when you're back online.");
  }
}

export class DriveError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/* ------------------------------------------------------------------ */
/* Access token                                                        */
/* ------------------------------------------------------------------ */

let cachedToken: { token: string; expires: number; scope: string } | null = null;
let pendingToken: Promise<string> | null = null;

/** Gets a fresh access token; the server refreshes it with Google when needed. */
export function getAccessToken(force = false): Promise<string> {
  if (!force && cachedToken && Date.now() < cachedToken.expires - 60_000) return Promise.resolve(cachedToken.token);
  if (!pendingToken) {
    pendingToken = fetchSessionToken()
      .then((token) => {
        cachedToken = token;
        return token.token;
      })
      .finally(() => {
        pendingToken = null;
      });
  }
  return pendingToken;
}

interface SessionResponse {
  accessToken?: string;
  accessTokenExpires?: number;
  scope?: string;
  error?: string;
}

/** Asks our server for the session (Auth.js refreshes Google's token there if it has expired). */
async function fetchSessionToken(): Promise<{ token: string; expires: number; scope: string }> {
  let session: SessionResponse | null;
  try {
    const response = await fetch("/api/auth/session", { cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    session = (await response.json()) as SessionResponse | null;
  } catch {
    // Can't reach our own server: offline, not signed out.
    throw new OfflineError();
  }
  if (!session?.accessToken || session.error) throw new SignedOutError();
  return {
    token: session.accessToken,
    expires: session.accessTokenExpires ?? Date.now() + 5 * 60_000,
    scope: session.scope ?? "",
  };
}

export const DRIVE_READ_SCOPE = "https://www.googleapis.com/auth/drive.readonly";

/** Whether you've allowed the app to read photos in a folder you chose (needed for folder watching). */
export async function canReadFolders(): Promise<boolean> {
  await getAccessToken();
  return cachedToken?.scope.split(" ").includes(DRIVE_READ_SCOPE) ?? false;
}

/** For tests and sign-out. */
export function forgetAccessToken() {
  cachedToken = null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch() with the auth header, one token refresh on 401, and retries on rate limits / server errors. */
export async function driveFetch(url: string, init: RequestInit = {}): Promise<Response> {
  let token = await getAccessToken();
  let refreshed = false;

  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        headers: { ...(init.headers as Record<string, string>), Authorization: `Bearer ${token}` },
      });
    } catch {
      if (typeof navigator !== "undefined" && !navigator.onLine) throw new OfflineError();
      if (attempt < 2) {
        await sleep(800 * (attempt + 1));
        continue;
      }
      throw new OfflineError();
    }

    if (response.status === 401 && !refreshed) {
      refreshed = true;
      token = await getAccessToken(true);
      continue;
    }
    if ((response.status === 429 || response.status >= 500) && attempt < 3) {
      await sleep(1000 * 2 ** attempt);
      continue;
    }
    if (!response.ok) {
      let message = `Google Drive error (${response.status})`;
      try {
        const body = (await response.json()) as { error?: { message?: string } };
        if (body.error?.message) message = body.error.message;
      } catch {
        // not JSON
      }
      if (response.status === 401) throw new SignedOutError();
      throw new DriveError(response.status, message);
    }
    return response;
  }
}

/* ------------------------------------------------------------------ */
/* File operations                                                     */
/* ------------------------------------------------------------------ */

export interface DriveFile {
  id: string;
  name: string;
  appProperties?: Record<string, string>;
}

const FILE_FIELDS = "id,name,appProperties";

/** Escapes a value for use inside a Drive search query string. */
const q = (value: string) => value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

export async function findFiles(query: string): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    q: `${query} and trashed = false`,
    fields: `files(${FILE_FIELDS})`,
    orderBy: "createdTime",
    spaces: "drive",
    pageSize: "20",
  });
  const response = await driveFetch(`${API}/files?${params}`);
  return ((await response.json()) as { files: DriveFile[] }).files;
}

export function appPropertyQuery(key: string, value: string) {
  return `appProperties has { key='${q(key)}' and value='${q(value)}' }`;
}

export function inFolderQuery(folderId: string) {
  return `'${q(folderId)}' in parents`;
}

export async function createFolder(name: string, parentId: string | null, appProperties: Record<string, string>) {
  const response = await driveFetch(`${API}/files?fields=${FILE_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
      appProperties,
    }),
  });
  return (await response.json()) as DriveFile;
}

function multipartBody(metadata: object, content: Blob): { body: Blob; contentType: string } {
  const boundary = `memorybook${Math.random().toString(36).slice(2)}`;
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${content.type || "application/octet-stream"}\r\n\r\n`,
    content,
    `\r\n--${boundary}--`,
  ]);
  return { body, contentType: `multipart/related; boundary=${boundary}` };
}

/** Uploads a new file (photo or JSON) in one request. */
export async function createFile(
  name: string,
  parentId: string,
  content: Blob,
  appProperties: Record<string, string> = {},
): Promise<DriveFile> {
  const { body, contentType } = multipartBody({ name, parents: [parentId], appProperties }, content);
  const response = await driveFetch(`${UPLOAD}/files?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
  return (await response.json()) as DriveFile;
}

/** Replaces the contents of an existing file. */
export async function updateFileContent(fileId: string, content: Blob): Promise<void> {
  await driveFetch(`${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": content.type || "application/octet-stream" },
    body: content,
  });
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}?alt=media`);
  return response.blob();
}

export async function updateMetadata(fileId: string, metadata: { name?: string; trashed?: boolean }) {
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

/** Moves a file to the Drive bin (recoverable for 30 days) rather than deleting it forever. */
export const trashFile = (fileId: string) => updateMetadata(fileId, { trashed: true });

/* ------------------------------------------------------------------ */
/* Reading a folder you chose (needs the read-only permission)          */
/* ------------------------------------------------------------------ */

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  imageMediaMetadata?: { time?: string; width?: number; height?: number };
}

async function listAll<T>(query: string, fields: string, orderBy = "createdTime"): Promise<T[]> {
  const items: T[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `${query} and trashed = false`,
      fields: `nextPageToken,files(${fields})`,
      orderBy,
      pageSize: "200",
      spaces: "drive",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(`${API}/files?${params}`);
    const body = (await response.json()) as { files: T[]; nextPageToken?: string };
    items.push(...body.files);
    pageToken = body.nextPageToken;
  } while (pageToken);
  return items;
}

/** Every photo directly inside a folder, oldest first. */
export function listImagesInFolder(folderId: string): Promise<DriveImage[]> {
  return listAll<DriveImage>(
    `${inFolderQuery(folderId)} and mimeType contains 'image/'`,
    "id,name,mimeType,createdTime,imageMediaMetadata(time,width,height)",
  );
}

/** Sub-folders of a folder ("root" = My Drive), A–Z. */
export function listFolders(parentId: string): Promise<DriveFile[]> {
  return listAll<DriveFile>(
    `${inFolderQuery(parentId)} and mimeType = 'application/vnd.google-apps.folder'`,
    FILE_FIELDS,
    "name",
  );
}
