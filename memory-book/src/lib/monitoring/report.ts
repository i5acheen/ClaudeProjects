"use client";

import { scrubReport } from "./scrub";

/** Sends a scrubbed error report (at most a few per visit, each kind once). */
const sent = new Set<string>();
const MAX_REPORTS = 5;

export function reportError(error: unknown) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const report = scrubReport({ kind: e.name, message: e.message, path: window.location.href, frames: e.stack });
    const key = `${report.kind}:${report.message}`;
    if (sent.has(key) || sent.size >= MAX_REPORTS) return;
    sent.add(key);
    const body = JSON.stringify(report);
    if (navigator.sendBeacon) navigator.sendBeacon("/api/client-error", new Blob([body], { type: "application/json" }));
    else void fetch("/api/client-error", { method: "POST", body, keepalive: true }).catch(() => undefined);
  } catch {
    // reporting must never cause trouble of its own
  }
}

/** Catches errors anywhere in the page. */
export function watchForErrors() {
  window.addEventListener("error", (event) => reportError(event.error ?? event.message));
  window.addEventListener("unhandledrejection", (event) => {
    // Being offline or signed out isn't a bug.
    const name = (event.reason as Error | undefined)?.name;
    if (name === "OfflineError" || name === "SignedOutError") return;
    reportError(event.reason);
  });
}
