import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { fetchFormLeadsSince, fetchLead, GraphError } from "@/lib/meta/graph";
import { downloadMedia, sendTemplate, sendText, WaApiError } from "@/lib/whatsapp/cloud";

const G = "https://graph.facebook.com/v21.0";
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const graphCfg = { version: "v21.0", accessToken: "page-token" };
const waCfg = { version: "v21.0", phoneNumberId: "PNID", accessToken: "wa-token" };

describe("Meta Graph client", () => {
  it("fetches a lead with the bearer token", async () => {
    server.use(
      http.get(`${G}/123`, ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer page-token");
        return HttpResponse.json({
          id: "123",
          created_time: "2026-10-30T10:00:00+0000",
          ad_id: "AD1",
          field_data: [{ name: "full_name", values: ["Asha"] }],
        });
      }),
    );
    const lead = await fetchLead(graphCfg, "123");
    expect(lead.ad_id).toBe("AD1");
  });

  it("surfaces Graph errors with code (e.g. expired token 190)", async () => {
    server.use(http.get(`${G}/123`, () => HttpResponse.json({ error: { message: "Session expired", code: 190 } }, { status: 400 })));
    await expect(fetchLead(graphCfg, "123")).rejects.toMatchObject({ code: 190 } satisfies Partial<GraphError>);
  });

  it("rejects payloads missing required fields", async () => {
    server.use(http.get(`${G}/123`, () => HttpResponse.json({ id: "123" })));
    await expect(fetchLead(graphCfg, "123")).rejects.toThrow();
  });

  it("backfill follows paging", async () => {
    let calls = 0;
    server.use(
      http.get(`${G}/F1/leads`, ({ request }) => {
        calls += 1;
        const after = new URL(request.url).searchParams.get("after");
        const lead = (id: string) => ({ id, created_time: "2026-10-30T10:00:00+0000", field_data: [] });
        return after
          ? HttpResponse.json({ data: [lead("2")] })
          : HttpResponse.json({ data: [lead("1")], paging: { cursors: { after: "c1" }, next: "https://next" } });
      }),
    );
    const leads = await fetchFormLeadsSince(graphCfg, "F1", 0);
    expect(leads.map((l) => l.id)).toEqual(["1", "2"]);
    expect(calls).toBe(2);
  });
});

describe("WhatsApp Cloud client", () => {
  it("sends text without the leading + and returns the wamid", async () => {
    server.use(
      http.post(`${G}/PNID/messages`, async ({ request }) => {
        const body = (await request.json()) as Record<string, unknown>;
        expect(body).toMatchObject({ messaging_product: "whatsapp", to: "919876543210", type: "text" });
        return HttpResponse.json({ messages: [{ id: "wamid.1" }] });
      }),
    );
    expect(await sendText(waCfg, "+919876543210", "नमस्कार")).toBe("wamid.1");
  });

  it("sends templates with body parameters", async () => {
    server.use(
      http.post(`${G}/PNID/messages`, async ({ request }) => {
        const body = (await request.json()) as { template: { name: string; components: { parameters: { text: string }[] }[] } };
        expect(body.template.name).toBe("lead_greeting_mr");
        expect(body.template.components[0].parameters[0].text).toBe("Asha");
        return HttpResponse.json({ messages: [{ id: "wamid.2" }] });
      }),
    );
    expect(await sendTemplate(waCfg, "+919876543210", "lead_greeting_mr", "mr", ["Asha"])).toBe("wamid.2");
  });

  it("maps API errors (131047 = window closed)", async () => {
    server.use(
      http.post(`${G}/PNID/messages`, () =>
        HttpResponse.json({ error: { message: "Re-engagement message", code: 131047 } }, { status: 400 }),
      ),
    );
    await expect(sendText(waCfg, "+919876543210", "hi")).rejects.toMatchObject({ code: 131047, status: 400 } satisfies Partial<WaApiError>);
  });

  it("downloads media in two steps", async () => {
    server.use(
      http.get(`${G}/MEDIA1`, () => HttpResponse.json({ url: "https://lookaside.example/m1", mime_type: "image/jpeg", file_size: 3 })),
      http.get("https://lookaside.example/m1", ({ request }) => {
        expect(request.headers.get("authorization")).toBe("Bearer wa-token");
        return new HttpResponse(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } });
      }),
    );
    const m = await downloadMedia(waCfg, "MEDIA1");
    expect(m).toMatchObject({ mimeType: "image/jpeg", size: 3 });
  });
});
