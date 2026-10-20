"use client";

import { idbClear } from "./idb";
import { forgetAccessToken } from "./drive/client";

/**
 * Removes this device's copies of the book (cached journal, photo copies,
 * offline pages), so the next person to use this browser can't see them.
 * Memories not uploaded yet are kept unless `includingDrafts`, and they only
 * ever upload into the book of the account that wrote them.
 */
export async function clearDeviceData({ includingDrafts = false } = {}) {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith("memory-book:"))
      .forEach((k) => localStorage.removeItem(k));
    await idbClear("photos");
    if (includingDrafts) await idbClear("drafts");
    if ("caches" in window) for (const key of await caches.keys()) if (key.startsWith("pages-")) await caches.delete(key);
  } catch {
    // nothing to clear
  }
  forgetAccessToken();
}

/** Asks our server to tell Google to cancel Memory Book's access for this account. */
export function revokeGoogleAccess() {
  return fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "revoke-google" }),
  }).catch(() => undefined);
}
