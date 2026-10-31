/** IST day/month boundaries as UTC ISO strings. */
const IST_MS = 5.5 * 3600_000;

export function istStartOfDay(d = new Date()): string {
  const ist = new Date(d.getTime() + IST_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_MS).toISOString();
}

export function istStartOfMonth(d = new Date()): string {
  const ist = new Date(d.getTime() + IST_MS);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), 1) - IST_MS).toISOString();
}

export function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400_000).toISOString();
}

export function fmtDateTime(iso: string | null, locale = "en-IN"): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
}
