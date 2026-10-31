import { z } from "zod";

const mediaSchema = z.object({
  id: z.string(),
  mime_type: z.string().optional(),
  caption: z.string().optional(),
  filename: z.string().optional(),
});

export const waInboundMessageSchema = z.object({
  from: z.string(),
  id: z.string(),
  timestamp: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  image: mediaSchema.optional(),
  document: mediaSchema.optional(),
  audio: mediaSchema.optional(),
  interactive: z
    .object({
      type: z.string(),
      button_reply: z.object({ id: z.string(), title: z.string() }).optional(),
      list_reply: z.object({ id: z.string(), title: z.string() }).optional(),
    })
    .optional(),
  button: z.object({ text: z.string(), payload: z.string().optional() }).optional(),
});
export type WaInboundMessage = z.infer<typeof waInboundMessageSchema>;

export const waStatusSchema = z.object({
  id: z.string(),
  status: z.enum(["sent", "delivered", "read", "failed"]),
  timestamp: z.string(),
  recipient_id: z.string(),
  errors: z.array(z.object({ code: z.number(), title: z.string().optional() })).optional(),
});
export type WaStatus = z.infer<typeof waStatusSchema>;

export const waWebhookSchema = z.object({
  object: z.literal("whatsapp_business_account"),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          field: z.string(),
          value: z.object({
            messaging_product: z.literal("whatsapp").optional(),
            metadata: z.object({ phone_number_id: z.string(), display_phone_number: z.string().optional() }),
            contacts: z.array(z.object({ wa_id: z.string(), profile: z.object({ name: z.string() }).optional() })).optional(),
            messages: z.array(waInboundMessageSchema).optional(),
            statuses: z.array(waStatusSchema).optional(),
          }),
        }),
      ),
    }),
  ),
});

export type WaEvent =
  | { kind: "message"; key: string; phoneNumberId: string; profileName?: string; message: WaInboundMessage }
  | { kind: "status"; key: string; phoneNumberId: string; status: WaStatus };

export function extractWaEvents(payload: unknown): WaEvent[] {
  const parsed = waWebhookSchema.parse(payload);
  const out: WaEvent[] = [];
  for (const entry of parsed.entry) {
    for (const change of entry.changes) {
      if (change.field !== "messages") continue;
      const { metadata, contacts, messages, statuses } = change.value;
      for (const m of messages ?? []) {
        const profileName = contacts?.find((c) => c.wa_id === m.from)?.profile?.name;
        out.push({ kind: "message", key: `wa:msg:${m.id}`, phoneNumberId: metadata.phone_number_id, profileName, message: m });
      }
      for (const s of statuses ?? []) {
        out.push({ kind: "status", key: `wa:status:${s.id}:${s.status}`, phoneNumberId: metadata.phone_number_id, status: s });
      }
    }
  }
  return out;
}

/** Normalised view of an inbound message for storage and the bot. */
export function describeInbound(m: WaInboundMessage): {
  type: "text" | "image" | "document" | "audio" | "interactive";
  body: string | null;
  mediaId: string | null;
  mimeType: string | null;
} {
  if (m.text) return { type: "text", body: m.text.body, mediaId: null, mimeType: null };
  if (m.image) return { type: "image", body: m.image.caption ?? null, mediaId: m.image.id, mimeType: m.image.mime_type ?? null };
  if (m.document)
    return {
      type: "document",
      body: m.document.caption ?? m.document.filename ?? null,
      mediaId: m.document.id,
      mimeType: m.document.mime_type ?? null,
    };
  if (m.audio) return { type: "audio", body: null, mediaId: m.audio.id, mimeType: m.audio.mime_type ?? null };
  if (m.interactive) {
    const r = m.interactive.button_reply ?? m.interactive.list_reply;
    return { type: "interactive", body: r?.title ?? null, mediaId: null, mimeType: null };
  }
  if (m.button) return { type: "interactive", body: m.button.text, mediaId: null, mimeType: null };
  return { type: "text", body: null, mediaId: null, mimeType: null };
}
