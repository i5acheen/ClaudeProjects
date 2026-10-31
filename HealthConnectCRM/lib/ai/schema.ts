import { z } from "zod";

/** Bot output contract (CLAUDE.md §7). The model must return exactly this JSON. */
export const FACT_KEYS = ["problem", "since", "age", "district", "aadhaar", "ration_card", "scheme_card"] as const;
export type FactKey = (typeof FACT_KEYS)[number];

export const botOutputSchema = z.object({
  reply: z.string().min(1).max(1000),
  language: z.enum(["mr", "hi", "en"]),
  proposed_stage: z.number().int().min(0).max(5),
  handover: z.boolean(),
  handover_reason: z.string().max(200),
  facts: z.object(Object.fromEntries(FACT_KEYS.map((k) => [k, z.string().max(200)])) as Record<FactKey, z.ZodString>),
  confidence: z.number().min(0).max(1),
});
export type BotOutput = z.infer<typeof botOutputSchema>;

/** JSON Schema sent to the provider for constrained decoding. Our zod parse remains the source of truth. */
export const botOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["reply", "language", "proposed_stage", "handover", "handover_reason", "facts", "confidence"],
  properties: {
    reply: { type: "string" },
    language: { type: "string", enum: ["mr", "hi", "en"] },
    proposed_stage: { type: "integer" },
    handover: { type: "boolean" },
    handover_reason: { type: "string" },
    facts: {
      type: "object",
      additionalProperties: false,
      required: [...FACT_KEYS],
      properties: Object.fromEntries(FACT_KEYS.map((k) => [k, { type: "string" }])),
    },
    confidence: { type: "number" },
  },
} as const;

/** Tolerant JSON extraction: strips code fences / leading prose some models add. */
export function parseBotOutput(text: string): { ok: true; value: BotOutput } | { ok: false; error: string } {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return { ok: false, error: "no JSON object found" };
  let json: unknown;
  try {
    json = JSON.parse(text.slice(start, end + 1));
  } catch (e) {
    return { ok: false, error: `invalid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  const parsed = botOutputSchema.safeParse(json);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  return { ok: true, value: parsed.data };
}
