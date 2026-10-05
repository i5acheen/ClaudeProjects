export function formatDate(date: Date | string | null): string {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function daysUntil(date: Date | string | null): number | null {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.ceil((d.getTime() - Date.now()) / msPerDay);
}

export function daysSince(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((Date.now() - d.getTime()) / msPerDay);
}

/** Latest evidence timestamp (if any) and whether it's past STALE_AFTER_DAYS. */
export function getEvidenceStaleness(
  evidenceDates: Date[],
  staleAfterDays: number
): { latest: Date | null; stale: boolean } {
  if (evidenceDates.length === 0) return { latest: null, stale: false };
  const latest = evidenceDates.reduce((max, d) => (d > max ? d : max), evidenceDates[0]);
  return { latest, stale: daysSince(latest) > staleAfterDays };
}

export function formatTimestamp(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
