import { z } from "zod";
import { toE164 } from "@/lib/phone";
import type { GraphLead } from "./graph";

/** CRM fields a Meta form question can map to (Settings → Meta field mapping). */
export const CRM_FIELDS = [
  "full_name",
  "phone",
  "district",
  "taluka",
  "treatment",
  "has_scheme_card",
  "age",
  "language",
  "ignore",
] as const;
export type CrmField = (typeof CRM_FIELDS)[number];

export const fieldMappingSchema = z.record(z.string(), z.enum(CRM_FIELDS));
export type FieldMapping = z.infer<typeof fieldMappingSchema>;

/** Sensible defaults for Meta's standard question keys; admins override per form in Settings. */
export const DEFAULT_MAPPING: FieldMapping = {
  full_name: "full_name",
  phone_number: "phone",
  city: "district",
  district: "district",
  taluka: "taluka",
  treatment: "treatment",
  "do_you_have_an_ayushman/mjpjay_card?": "has_scheme_card",
  age: "age",
};

export type MappedLead = {
  fullName: string;
  phoneE164: string | null;
  district: string | null;
  taluka: string | null;
  treatment: string | null;
  scheme: "MJPJAY" | "PM-JAY" | "unknown";
  hasSchemeCard: string | null;
  age: number | null;
  language: "mr" | "hi" | "en";
  consentWhatsapp: boolean;
  unmapped: Record<string, string>;
};

function normaliseKey(k: string): string {
  return k.trim().toLowerCase().replace(/\s+/g, "_");
}

function detectScheme(v: string | null): MappedLead["scheme"] {
  if (!v) return "unknown";
  const s = v.toLowerCase();
  if (s.includes("mjp") || s.includes("jyotiba") || s.includes("ज्योतिबा")) return "MJPJAY";
  if (s.includes("ayushman") || s.includes("pm-jay") || s.includes("pmjay") || s.includes("आयुष्मान")) return "PM-JAY";
  return "unknown";
}

function detectLanguage(v: string | null): MappedLead["language"] {
  if (!v) return "mr";
  const s = v.toLowerCase();
  if (s.startsWith("hi") || s.includes("हिंदी") || s.includes("hindi")) return "hi";
  if (s.startsWith("en") || s.includes("english")) return "en";
  return "mr";
}

export function mapLead(lead: GraphLead, mapping: FieldMapping = DEFAULT_MAPPING): MappedLead {
  const merged: FieldMapping = { ...DEFAULT_MAPPING, ...Object.fromEntries(Object.entries(mapping).map(([k, v]) => [normaliseKey(k), v])) };
  const values: Partial<Record<CrmField, string>> = {};
  const unmapped: Record<string, string> = {};
  for (const f of lead.field_data) {
    const value = f.values.join(", ").trim();
    const target = merged[normaliseKey(f.name)];
    if (!target) unmapped[f.name] = value;
    else if (target !== "ignore" && value) values[target] = value;
  }
  const ageNum = values.age ? Number.parseInt(values.age, 10) : NaN;
  const consent = (lead.custom_disclaimer_responses ?? []).some(
    (r) => r.is_checked === true || r.is_checked === "1" || r.is_checked === "true",
  );
  return {
    fullName: values.full_name ?? "",
    phoneE164: values.phone ? toE164(values.phone) : null,
    district: values.district ?? null,
    taluka: values.taluka ?? null,
    treatment: values.treatment ?? null,
    scheme: detectScheme(values.has_scheme_card ?? null),
    hasSchemeCard: values.has_scheme_card ?? null,
    age: Number.isFinite(ageNum) && ageNum > 0 && ageNum <= 120 ? ageNum : null,
    language: detectLanguage(values.language ?? null),
    consentWhatsapp: consent,
    unmapped,
  };
}
