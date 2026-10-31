/** Normalise an Indian (or already-international) phone number to E.164. Returns null if invalid. */
export function toE164(raw: string, defaultCountry = "91"): string | null {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return null;
  let e164: string;
  if (trimmed.startsWith("+")) e164 = `+${digits}`;
  else if (digits.startsWith("00")) e164 = `+${digits.slice(2)}`;
  else if (digits.length === 10 && /^[6-9]/.test(digits)) e164 = `+${defaultCountry}${digits}`;
  else if (digits.length === 11 && digits.startsWith("0")) e164 = `+${defaultCountry}${digits.slice(1)}`;
  else if (digits.length === 12 && digits.startsWith(defaultCountry)) e164 = `+${digits}`;
  else return null;
  if (!/^\+[1-9]\d{7,14}$/.test(e164)) return null;
  if (e164.startsWith("+91") && !/^\+91[6-9]\d{9}$/.test(e164)) return null;
  return e164;
}

/** WhatsApp sends numbers without "+". */
export function fromWaId(waId: string): string | null {
  return toE164(`+${waId.replace(/^\+/, "")}`);
}

/** Masks for list views: +91 98XXX XX214 (CLAUDE.md §10). */
export function maskPhone(e164: string): string {
  if (e164.startsWith("anon:")) return "—";
  const m = /^\+91(\d{2})\d{3}\d{2}(\d{3})$/.exec(e164);
  if (m) return `+91 ${m[1]}XXX XX${m[2]}`;
  return e164.length > 6 ? `${e164.slice(0, 4)}${"X".repeat(e164.length - 7)}${e164.slice(-3)}` : "XXX";
}

/** Masks long digit runs (Aadhaar, phone, account numbers) before text goes to the AI model. */
export function maskNumbersForPrompt(text: string): string {
  return text.replace(/\d[\d\s-]{6,}\d/g, (m) => {
    const d = m.replace(/\D/g, "");
    return d.length >= 8 ? `[number ending ${d.slice(-2)}]` : m;
  });
}
