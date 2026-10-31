import { z } from "zod";
import { fetchWithTimeout } from "@/lib/utils";

/** Thin WhatsApp Cloud API client. All calls have timeouts; callers decide on retries. */
export type WaConfig = { version: string; phoneNumberId: string; accessToken: string; baseUrl?: string };

export class WaApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: number,
  ) {
    super(message);
  }
}

const sendResult = z.object({ messages: z.array(z.object({ id: z.string() })).min(1) });
const errorBody = z.object({ error: z.object({ message: z.string(), code: z.number().optional() }) });

function base(cfg: WaConfig) {
  return `${cfg.baseUrl ?? "https://graph.facebook.com"}/${cfg.version}`;
}

async function post(cfg: WaConfig, body: Record<string, unknown>): Promise<unknown> {
  const res = await fetchWithTimeout(`${base(cfg)}/${cfg.phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = errorBody.safeParse(json);
    throw new WaApiError(
      e.success ? e.data.error.message : `WhatsApp ${res.status}`,
      res.status,
      e.success ? e.data.error.code : undefined,
    );
  }
  return json;
}

export async function sendText(cfg: WaConfig, to: string, text: string): Promise<string> {
  const json = await post(cfg, { to: to.replace(/^\+/, ""), type: "text", text: { body: text, preview_url: false } });
  return sendResult.parse(json).messages[0].id;
}

export async function sendTemplate(cfg: WaConfig, to: string, name: string, language: string, params: string[]): Promise<string> {
  const components = params.length ? [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] : [];
  const json = await post(cfg, {
    to: to.replace(/^\+/, ""),
    type: "template",
    template: { name, language: { code: language }, components },
  });
  return sendResult.parse(json).messages[0].id;
}

export async function markRead(cfg: WaConfig, waMessageId: string, typing = false): Promise<void> {
  await post(cfg, { status: "read", message_id: waMessageId, ...(typing ? { typing_indicator: { type: "text" } } : {}) });
}

/** Two-step media download: resolve the short-lived URL, then fetch bytes with the same token. */
export async function downloadMedia(cfg: WaConfig, mediaId: string): Promise<{ bytes: ArrayBuffer; mimeType: string; size: number }> {
  const metaRes = await fetchWithTimeout(`${base(cfg)}/${encodeURIComponent(mediaId)}`, {
    headers: { Authorization: `Bearer ${cfg.accessToken}` },
  });
  if (!metaRes.ok) throw new WaApiError(`media lookup ${metaRes.status}`, metaRes.status);
  const meta = z.object({ url: z.string().url(), mime_type: z.string(), file_size: z.number().optional() }).parse(await metaRes.json());
  const fileRes = await fetchWithTimeout(meta.url, { headers: { Authorization: `Bearer ${cfg.accessToken}` } }, 20_000);
  if (!fileRes.ok) throw new WaApiError(`media download ${fileRes.status}`, fileRes.status);
  const bytes = await fileRes.arrayBuffer();
  return { bytes, mimeType: meta.mime_type, size: bytes.byteLength };
}
