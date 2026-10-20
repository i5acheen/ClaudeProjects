/**
 * Low-level Google Drive v3 calls, made straight from the browser with the
 * signed-in user's access token (so photos never pass through our server).
 */

const API = "https://www.googleapis.com/drive/v3";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export class SignedOutError extends Error {
  name = "SignedOutError";
  constructor() {
    super("Your Google sign-in has expired. Please sign in again.");
  }
}

/** Signed in, but the Google Drive permission wasn't given (e.g. the box was unticked on Google's screen). */
export class NoDrivePermissionError extends Error {
  name = "NoDrivePermissionError";
  constructor() {
    super("Memory Book needs your permission to keep the book in your Google Drive.");
  }
}

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
/** Google's reasons for "this sign-in doesn't include that permission". */
const MISSING_SCOPE = new Set(["insufficientPermissions", "ACCESS_TOKEN_SCOPE_INSUFFICIENT", "insufficientScopes"]);

export class OfflineError extends Error {
  name = "OfflineError";
  constructor() {
    super("You seem to be offline. Your memory is saved on this device and will upload when you're back online.");
  }
}

export class DriveError extends Error {
  name = "DriveError";
  constructor(
    public status: number,
    message: string,
    /** Google's short reason, e.g. "storageQuotaExceeded". */
    public reason?: string,
  ) {
    super(message);
  }
}

/** The person's Google Drive has no space left. */
export const isStorageFull = (e: unknown) =>
  e instanceof DriveError && (e.reason === "storageQuotaExceeded" || (e.status === 403 && /storage quota|quota has been exceeded/i.test(e.message)));

const RATE_LIMITED = new Set(["rateLimitExceeded", "userRateLimitExceeded"]);

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
  // Google tells us which permissions were given; without Drive the app can't keep the book.
  if (session.scope && !session.scope.split(" ").includes(DRIVE_SCOPE)) throw new NoDrivePermissionError();
  return {
    token: session.accessToken,
    expires: session.accessTokenExpires ?? Date.now() + 5 * 60_000,
    scope: session.scope ?? "",
  };
}


/** For tests and sign-out. */
export function forgetAccessToken() {
  cachedToken = null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Waits longer after each try (about 1s, 2s, 4s, 8s), with a little randomness so devices don't retry in step. */
const backoff = (attempt: number) => 1000 * 2 ** attempt * (0.75 + Math.random() * 0.5);

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
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      await sleep(backoff(attempt));
      continue;
    }
    if (!response.ok) {
      let message = `Google Drive error (${response.status})`;
      let reason: string | undefined;
      try {
        const body = (await response.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
        if (body.error?.message) message = body.error.message;
        reason = body.error?.errors?.[0]?.reason;
      } catch {
        // not JSON
      }
      if (response.status === 401) throw new SignedOutError();
      if (response.status === 403 && (MISSING_SCOPE.has(reason ?? "") || /insufficient (authentication )?scopes?/i.test(message)))
        throw new NoDrivePermissionError();
      // Google sometimes reports "slow down" as a 403: wait and try again, like a 429.
      if (response.status === 403 && reason && RATE_LIMITED.has(reason) && attempt < 4) {
        await sleep(backoff(attempt));
        continue;
      }
      throw new DriveError(response.status, message, reason);
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
      // Family who can add memories still can't share the book onwards.
      writersCanShare: false,
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
  const { body, contentType } = multipartBody({ name, parents: [parentId], appProperties, writersCanShare: false }, content);
  const response = await driveFetch(`${UPLOAD}/files?uploadType=multipart&fields=${FILE_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": contentType },
    body,
  });
  return (await response.json()) as DriveFile;
}

/** Replaces the contents of an existing file; returns the new version's revision ID. */
export async function updateFileContent(fileId: string, content: Blob): Promise<string | undefined> {
  const response = await driveFetch(`${UPLOAD}/files/${encodeURIComponent(fileId)}?uploadType=media&fields=headRevisionId`, {
    method: "PATCH",
    headers: { "Content-Type": content.type || "application/octet-stream" },
    body: content,
  });
  return ((await response.json().catch(() => ({}))) as { headRevisionId?: string }).headRevisionId;
}

/* Versions of a file: used to notice when two people save at the same moment. */

/** The ID of the file's current version. */
export async function headRevision(fileId: string): Promise<string | undefined> {
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}?fields=headRevisionId`);
  return ((await response.json()) as { headRevisionId?: string }).headRevisionId;
}

/** The contents of one exact version of a file. */
export async function downloadRevision(fileId: string, revisionId: string): Promise<Blob> {
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/revisions/${encodeURIComponent(revisionId)}?alt=media`);
  return response.blob();
}

/** All kept version IDs of a file, oldest first. */
export async function listRevisionIds(fileId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ fields: "nextPageToken,revisions(id)", pageSize: "1000" });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/revisions?${params}`);
    const body = (await response.json()) as { revisions?: { id: string }[]; nextPageToken?: string };
    ids.push(...(body.revisions ?? []).map((r) => r.id));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return ids;
}

export async function downloadFile(fileId: string): Promise<Blob> {
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}?alt=media`);
  return response.blob();
}

export async function updateMetadata(
  fileId: string,
  metadata: { name?: string; trashed?: boolean; writersCanShare?: boolean; appProperties?: Record<string, string> },
) {
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(metadata),
  });
}

/** Moves a file to the Drive bin (recoverable for 30 days) rather than deleting it forever. */
export const trashFile = (fileId: string) => updateMetadata(fileId, { trashed: true });

/* ------------------------------------------------------------------ */
/* Photos you picked from your Drive                                   */
/* ------------------------------------------------------------------ */

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  imageMediaMetadata?: { time?: string; width?: number; height?: number };
  appProperties?: Record<string, string>;
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

/** Details of one photo you picked in Google's picker (the app may read it now). */
export async function getImageInfo(fileId: string): Promise<DriveImage> {
  const response = await driveFetch(
    `${API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,createdTime,imageMediaMetadata(time,width,height),appProperties`,
  );
  return (await response.json()) as DriveImage;
}



/* ------------------------------------------------------------------ */
/* Sharing with family (Drive's own sharing — nothing stored by us)     */
/* ------------------------------------------------------------------ */


export interface DrivePermission {
  id: string;
  type: string;
  role: "owner" | "organizer" | "fileOrganizer" | "writer" | "commenter" | "reader";
  emailAddress?: string;
  displayName?: string;
}

export async function listPermissions(fileId: string): Promise<DrivePermission[]> {
  const response = await driveFetch(
    `${API}/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`,
  );
  return ((await response.json()) as { permissions: DrivePermission[] }).permissions;
}

/** Shares a file or folder with someone; Google emails them the invitation. */
export async function addPermission(fileId: string, email: string, role: "reader" | "writer", message: string) {
  const params = new URLSearchParams({ sendNotificationEmail: "true", emailMessage: message });
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/permissions?${params}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user", role, emailAddress: email }),
  });
}

export async function removePermission(fileId: string, permissionId: string) {
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/permissions/${encodeURIComponent(permissionId)}`, {
    method: "DELETE",
  });
}

export interface FileAccess {
  ownedByMe: boolean;
  capabilities?: { canEdit?: boolean };
  owners?: { displayName?: string; emailAddress?: string }[];
}

export async function getFileAccess(fileId: string): Promise<FileAccess> {
  const response = await driveFetch(
    `${API}/files/${encodeURIComponent(fileId)}?fields=ownedByMe,capabilities(canEdit),owners(displayName,emailAddress)`,
  );
  return (await response.json()) as FileAccess;
}

/* ------------------------------------------------------------------ */
/* Keeping the book private                                            */
/* ------------------------------------------------------------------ */

/** Sharing that reaches beyond named people: "anyone with the link" or a whole organisation. */
export const isPublicPermission = (p: DrivePermission) => p.type === "anyone" || p.type === "domain";

/** IDs of files in these folders that are shared beyond named people. */
export function listPublicFiles(folderIds: string[]): Promise<{ id: string }[]> {
  const parents = folderIds.map((id) => inFolderQuery(id)).join(" or ");
  const visibility = ["anyoneWithLink", "anyoneCanFind", "domainWithLink", "domainCanFind"]
    .map((v) => `visibility = '${v}'`)
    .join(" or ");
  return listAll<{ id: string }>(`(${parents}) and (${visibility})`, "id");
}

/** IDs of all files in a folder that you own. */
export function listOwnedFiles(folderId: string): Promise<{ id: string }[]> {
  return listAll<{ id: string }>(`${inFolderQuery(folderId)} and 'me' in owners`, "id");
}

/* ------------------------------------------------------------------ */
/* The book's own files                                                */
/* ------------------------------------------------------------------ */

export interface DriveChild {
  id: string;
  name: string;
  createdTime?: string;
  appProperties?: Record<string, string>;
  /** The current version, so unchanged files needn't be downloaded again. */
  headRevisionId?: string;
}

/** Every file directly inside a folder that the app can see, oldest first. */
export function listFolderFiles(folderId: string): Promise<DriveChild[]> {
  return listAll<DriveChild>(inFolderQuery(folderId), "id,name,createdTime,appProperties,headRevisionId");
}

/** Copies a file (e.g. into the backups folder). The copy belongs to you. */
export async function copyFile(fileId: string, name: string, parentId: string, appProperties: Record<string, string> = {}): Promise<DriveFile> {
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/copy?fields=${FILE_FIELDS}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, parents: [parentId], appProperties, writersCanShare: false }),
  });
  return (await response.json()) as DriveFile;
}

/** Files in a folder that are in the Drive bin (to rescue a book file deleted by mistake). */
export async function listTrashedInFolder(folderId: string): Promise<DriveChild[]> {
  const params = new URLSearchParams({
    q: `${inFolderQuery(folderId)} and trashed = true`,
    fields: "files(id,name,createdTime,appProperties)",
    pageSize: "100",
    spaces: "drive",
  });
  const response = await driveFetch(`${API}/files?${params}`);
  return ((await response.json()) as { files: DriveChild[] }).files;
}

/** Kept versions of a file, oldest first, with when each was saved. */
export async function listRevisions(fileId: string): Promise<{ id: string; modifiedTime?: string }[]> {
  const params = new URLSearchParams({ fields: "revisions(id,modifiedTime)", pageSize: "1000" });
  const response = await driveFetch(`${API}/files/${encodeURIComponent(fileId)}/revisions?${params}`);
  return ((await response.json()) as { revisions?: { id: string; modifiedTime?: string }[] }).revisions ?? [];
}

/** How full the person's Google Drive is, in bytes (limit is missing for unlimited plans). */
export async function getStorageQuota(): Promise<{ used: number; limit?: number }> {
  const response = await driveFetch(`${API}/about?fields=storageQuota(limit,usage)`);
  const { storageQuota } = (await response.json()) as { storageQuota?: { limit?: string; usage?: string } };
  return { used: Number(storageQuota?.usage ?? 0), limit: storageQuota?.limit ? Number(storageQuota.limit) : undefined };
}

/** Files in a folder that belong to someone else (e.g. photos a family member added). */
export function listFilesOwnedByOthers(folderId: string): Promise<DriveChild[]> {
  return listAll<DriveChild>(`${inFolderQuery(folderId)} and not 'me' in owners`, "id,name,createdTime,appProperties");
}

/** Takes a file out of a folder without deleting it (best effort). */
export async function removeFromFolder(fileId: string, folderId: string): Promise<void> {
  await driveFetch(`${API}/files/${encodeURIComponent(fileId)}?removeParents=${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
