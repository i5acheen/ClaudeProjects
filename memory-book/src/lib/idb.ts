/**
 * A tiny promise wrapper around IndexedDB (the browser's built-in database).
 * Used for the photo cache and for memories waiting to be uploaded.
 */

const DB_NAME = "memory-book";
const DB_VERSION = 2;
/** photos: photo copies · drafts: memories waiting to upload · journal: the book, to open instantly · files: book files by version. */
export type StoreName = "photos" | "drafts" | "journal" | "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("photos")) db.createObjectStore("photos");
        if (!db.objectStoreNames.contains("drafts")) db.createObjectStore("drafts");
        if (!db.objectStoreNames.contains("journal")) db.createObjectStore("journal");
        if (!db.objectStoreNames.contains("files")) db.createObjectStore("files");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        dbPromise = null;
        reject(request.error);
      };
    });
  }
  return dbPromise;
}

function run<T>(store: StoreName, mode: IDBTransactionMode, op: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = op(tx.objectStore(store));
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export const idbGet = <T>(store: StoreName, key: string) =>
  run<T | undefined>(store, "readonly", (s) => s.get(key) as IDBRequest<T | undefined>);

export const idbPut = (store: StoreName, key: string, value: unknown) =>
  run(store, "readwrite", (s) => s.put(value, key)).then(() => undefined);

export const idbDelete = (store: StoreName, key: string) =>
  run(store, "readwrite", (s) => s.delete(key)).then(() => undefined);

export const idbGetAll = <T>(store: StoreName) => run<T[]>(store, "readonly", (s) => s.getAll() as IDBRequest<T[]>);

export const idbClear = (store: StoreName) => run(store, "readwrite", (s) => s.clear()).then(() => undefined);
