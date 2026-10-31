/** Structured JSON logger. Redacts secrets and personal data by key name and by pattern. */
type Level = "debug" | "info" | "warn" | "error";
type Fields = Record<string, unknown>;

const REDACT_KEYS = /token|secret|password|authorization|api[_-]?key|signature|phone|aadhaar|body|full_name|name$/i;
const PHONE = /\+?\d[\d\s-]{8,}\d/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[depth]";
  if (typeof value === "string") return value.replace(PHONE, "[redacted-number]");
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name, message: redact(value.message, depth + 1) };
  if (value && typeof value === "object") {
    const out: Fields = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = REDACT_KEYS.test(k) ? "[redacted]" : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

function write(level: Level, msg: string, fields: Fields = {}) {
  const line = JSON.stringify({ level, msg, time: new Date().toISOString(), ...(redact(fields) as Fields) });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logger(base: Fields = {}) {
  return {
    debug: (msg: string, f?: Fields) => write("debug", msg, { ...base, ...f }),
    info: (msg: string, f?: Fields) => write("info", msg, { ...base, ...f }),
    warn: (msg: string, f?: Fields) => write("warn", msg, { ...base, ...f }),
    error: (msg: string, f?: Fields) => write("error", msg, { ...base, ...f }),
    child: (f: Fields) => logger({ ...base, ...f }),
  };
}

export const log = logger({ service: "healthconnectcrm" });

export function requestId(headers: Headers): string {
  return headers.get("x-request-id") ?? headers.get("x-vercel-id") ?? crypto.randomUUID();
}
