/**
 * Error reports must never carry a child's details, memories or photos.
 * Everything that could be personal is removed before a report is kept:
 * only the kind of error, a cleaned-up message, the page's path and where in
 * the app's own code it happened.
 */

const MAX = 300;

export function scrubText(text: unknown): string {
  return (
    String(text ?? "")
      .replace(/https?:\/\/\S+/g, (url) => scrubUrl(url))
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email]") // email addresses
      .replace(/["“«][^"”»]*["”»]/g, "[text]") // anything in double quotes (titles, words)
      .replace(/(^|[\s(])['‘][^'’]*['’]/g, "$1[text]") // anything in single quotes (not apostrophes inside words)
      .replace(/\b[A-Za-z0-9_-]{20,}\b/g, "[id]") // Drive IDs, tokens
      .replace(/\b\d{4,}\b/g, "[number]") // phone numbers, dates written as numbers, sizes
      // Names are usually capitalised: keep only the first word of the message as written.
      .replace(/(?<=\S\s+)\b[A-Z][a-z\u00C0-\u024F'’-]+/g, "[Name]")
      .slice(0, MAX)
  );
}

/** Keeps only our own origin and path (never query strings, which may hold IDs). */
export function scrubUrl(url: unknown): string {
  try {
    const u = new URL(String(url));
    return `${u.origin}${u.pathname.replace(/\/book\/edit\/[^/]+/, "/book/edit/[id]")}`;
  } catch {
    return "[url]";
  }
}

/** Stack frames reduced to "file:line:column" in the app's own code. */
export function scrubStack(stack: unknown): string[] {
  return String(stack ?? "")
    .split("\n")
    .map((line) => line.match(/(\/_next\/static\/[^\s):]+:\d+:\d+)/)?.[1])
    .filter((frame): frame is string => !!frame)
    .slice(0, 8);
}

export interface ErrorReport {
  kind: string;
  message: string;
  path: string;
  frames: string[];
  release?: string;
}

export function scrubReport(raw: unknown): ErrorReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    kind: String(r.kind ?? "Error").replace(/[^A-Za-z]/g, "").slice(0, 40) || "Error",
    message: scrubText(r.message),
    path: scrubUrl(r.path).replace(/^https?:\/\/[^/]+/, ""),
    frames: scrubStack(Array.isArray(r.frames) ? r.frames.join("\n") : r.frames),
    release: typeof r.release === "string" ? r.release.slice(0, 12) : undefined,
  };
}
