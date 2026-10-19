"use client";

import { useEffect } from "react";

/** Registers the service worker, so the app can be installed and opens offline. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not essential: the app works without it.
    });
  }, []);
  return null;
}
