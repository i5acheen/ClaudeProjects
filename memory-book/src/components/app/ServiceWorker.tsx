"use client";

import { useEffect } from "react";
import { watchForErrors } from "@/lib/monitoring/report";

/** Registers the service worker, so the app can be installed and opens offline. */
export function ServiceWorker() {
  // Privacy-safe error reports (see lib/monitoring/scrub.ts).
  useEffect(() => watchForErrors(), []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Not essential: the app works without it.
    });
  }, []);
  return null;
}
