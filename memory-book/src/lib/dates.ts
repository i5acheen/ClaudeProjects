/**
 * Date helpers. Memory dates are plain calendar dates (`YYYY-MM-DD`), so all
 * maths is done in UTC to avoid a memory shifting a day across time zones.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toDayString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** Adds whole months, clamping to the end of shorter months (31 Jan + 1 → 28/29 Feb). */
function addMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const target = new Date(Date.UTC(y, m, 1));
  const day = Math.min(date.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth()));
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), day));
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * A friendly age stamp, e.g. "5 months, 12 days old".
 * `dob` and `on` are `YYYY-MM-DD` strings.
 */
export function ageStamp(dob: string, on: string): string {
  const birth = parseDay(dob);
  const day = parseDay(on);
  const diffDays = Math.round((day.getTime() - birth.getTime()) / DAY_MS);

  if (diffDays === 0) return "The day you were born";
  if (diffDays < 0) {
    const weeks = Math.floor(-diffDays / 7);
    return weeks >= 1 ? `${plural(weeks, "week")} before you arrived` : "Just before you arrived";
  }

  let months =
    (day.getUTCFullYear() - birth.getUTCFullYear()) * 12 + (day.getUTCMonth() - birth.getUTCMonth());
  if (addMonths(birth, months).getTime() > day.getTime()) months -= 1;
  const days = Math.round((day.getTime() - addMonths(birth, months).getTime()) / DAY_MS);

  if (months === 0) return `${plural(days, "day")} old`;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;

  if (years === 0) {
    return days === 0 ? `${plural(months, "month")} old` : `${plural(months, "month")}, ${plural(days, "day")} old`;
  }
  if (remMonths === 0 && days === 0) return `Your ${ordinal(years)} birthday`;
  return remMonths === 0 ? `${plural(years, "year")} old` : `${plural(years, "year")}, ${plural(remMonths, "month")} old`;
}

// Formatted by hand rather than with toLocaleDateString, whose output differs
// between Node and browsers and would break server/client hydration.
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "Thursday, 7 May 2026" */
export function longDate(iso: string): string {
  const d = parseDay(iso);
  return `${WEEKDAYS[d.getUTCDay()]}, ${shortDate(iso)}`;
}

/** "7 May 2026" */
export function shortDate(iso: string): string {
  const d = parseDay(iso);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** "May 2026" — used to group the timeline. */
export function monthLabel(iso: string): string {
  const d = parseDay(iso);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
