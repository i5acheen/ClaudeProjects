import { z } from "zod";

/** Meta Page webhook payload for the `leadgen` field. */
export const leadgenChangeSchema = z.object({
  field: z.literal("leadgen"),
  value: z.object({
    leadgen_id: z.string().min(1),
    page_id: z.string().min(1),
    form_id: z.string().optional(),
    ad_id: z.string().optional(),
    adgroup_id: z.string().optional(),
    created_time: z.number().optional(),
  }),
});

export const metaWebhookSchema = z.object({
  object: z.literal("page"),
  entry: z.array(
    z.object({
      id: z.string(),
      time: z.number(),
      changes: z.array(z.object({ field: z.string(), value: z.unknown() })),
    }),
  ),
});

export type LeadgenEvent = z.infer<typeof leadgenChangeSchema>["value"];

/** Extracts leadgen events; ignores other fields the page may be subscribed to. */
export function extractLeadgenEvents(payload: unknown): LeadgenEvent[] {
  const parsed = metaWebhookSchema.parse(payload);
  const out: LeadgenEvent[] = [];
  for (const entry of parsed.entry) {
    for (const change of entry.changes) {
      const lg = leadgenChangeSchema.safeParse(change);
      if (lg.success) out.push(lg.data.value);
    }
  }
  return out;
}
