import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { signBody } from "@/lib/meta/signature";

const SECRET = "meta-app-secret-0123456789";
const stored = new Set<string>();
const sent: { name: string; data: unknown }[] = [];

vi.mock("@/lib/env", () => ({
  NotConfiguredError: class extends Error {},
  metaEnv: () => ({ META_APP_SECRET: SECRET, META_VERIFY_TOKEN: "meta-verify-token-xyz" }),
  waEnv: () => ({ META_APP_SECRET: SECRET, WA_VERIFY_TOKEN: "wa-verify-token-xyzw" }),
}));
vi.mock("@/lib/db/admin", () => ({ adminDb: () => ({}) }));
vi.mock("@/lib/webhooks", () => ({
  storeWebhookEvents: vi.fn(async (_db: unknown, _p: string, events: { key: string }[]) => {
    const fresh = new Map<string, string>();
    for (const e of events)
      if (!stored.has(e.key)) {
        stored.add(e.key);
        fresh.set(e.key, `id-${e.key}`);
      }
    return fresh;
  }),
}));
vi.mock("@/inngest/client", () => ({
  EVENTS: { leadReceived: "meta/lead.received", waMessage: "whatsapp/message.received", waStatus: "whatsapp/status.received" },
  inngest: { send: vi.fn(async (events: { name: string; data: unknown }[]) => void sent.push(...events)) },
}));

const meta = await import("@/app/api/webhooks/meta/route");
const wa = await import("@/app/api/webhooks/whatsapp/route");

function post(url: string, body: unknown, signature?: string) {
  const raw = JSON.stringify(body);
  return new NextRequest(url, { method: "POST", body: raw, headers: { "x-hub-signature-256": signature ?? signBody(raw, SECRET) } });
}

const leadgen = {
  object: "page",
  entry: [{ id: "P1", time: 1, changes: [{ field: "leadgen", value: { leadgen_id: "LG1", page_id: "P1", form_id: "F1" } }] }],
};
const waMsg = {
  object: "whatsapp_business_account",
  entry: [
    {
      id: "W",
      changes: [
        {
          field: "messages",
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: "PN" },
            contacts: [{ wa_id: "919876543210", profile: { name: "Asha" } }],
            messages: [
              {
                from: "919876543210",
                id: "wamid.A",
                timestamp: String(Math.floor(Date.now() / 1000)),
                type: "text",
                text: { body: "नमस्कार" },
              },
            ],
          },
        },
      ],
    },
  ],
};

beforeEach(() => {
  stored.clear();
  sent.length = 0;
});

describe("POST /api/webhooks/meta", () => {
  it("valid signature → stored and enqueued, 200", async () => {
    const res = await meta.POST(post("http://x/api/webhooks/meta", leadgen));
    expect(res.status).toBe(200);
    expect(sent).toEqual([
      expect.objectContaining({ name: "meta/lead.received", data: expect.objectContaining({ leadgenId: "LG1", pageId: "P1" }) }),
    ]);
  });
  it("bad signature → 401, nothing stored", async () => {
    const res = await meta.POST(post("http://x/api/webhooks/meta", leadgen, "sha256=" + "0".repeat(64)));
    expect(res.status).toBe(401);
    expect(stored.size).toBe(0);
    expect(sent).toHaveLength(0);
  });
  it("duplicate event → 200 but enqueued only once", async () => {
    await meta.POST(post("http://x/api/webhooks/meta", leadgen));
    const res = await meta.POST(post("http://x/api/webhooks/meta", leadgen));
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
  });
  it("missing fields → 400", async () => {
    const res = await meta.POST(post("http://x/api/webhooks/meta", { object: "page" }));
    expect(res.status).toBe(400);
  });
  it("ignores non-leadgen changes", async () => {
    const res = await meta.POST(
      post("http://x/api/webhooks/meta", { object: "page", entry: [{ id: "P1", time: 1, changes: [{ field: "feed", value: {} }] }] }),
    );
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });
  it("GET answers the verification challenge only with the right token", async () => {
    const ok = await meta.GET(
      new NextRequest("http://x/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=meta-verify-token-xyz&hub.challenge=777"),
    );
    expect(await ok.text()).toBe("777");
    const bad = await meta.GET(new NextRequest("http://x/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=777"));
    expect(bad.status).toBe(403);
  });
});

describe("POST /api/webhooks/whatsapp", () => {
  it("enqueues an inbound message once", async () => {
    expect((await wa.POST(post("http://x/api/webhooks/whatsapp", waMsg))).status).toBe(200);
    expect((await wa.POST(post("http://x/api/webhooks/whatsapp", waMsg))).status).toBe(200);
    expect(sent).toEqual([
      expect.objectContaining({
        name: "whatsapp/message.received",
        data: expect.objectContaining({ phoneNumberId: "PN", profileName: "Asha" }),
      }),
    ]);
  });
  it("enqueues status updates", async () => {
    const status = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "W",
          changes: [
            {
              field: "messages",
              value: {
                metadata: { phone_number_id: "PN" },
                statuses: [{ id: "wamid.B", status: "delivered", timestamp: "1", recipient_id: "91" }],
              },
            },
          ],
        },
      ],
    };
    await wa.POST(post("http://x/api/webhooks/whatsapp", status));
    expect(sent[0].name).toBe("whatsapp/status.received");
  });
  it("bad signature → 401", async () => {
    expect((await wa.POST(post("http://x/api/webhooks/whatsapp", waMsg, "sha256=00"))).status).toBe(401);
  });
});
