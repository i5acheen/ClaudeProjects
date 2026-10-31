import { describe, expect, it, vi } from "vitest";
import { runBotTurn, sanitiseFacts, type BotTurnInput } from "@/lib/ai/bot";
import type { AiProvider, CompletionRequest } from "@/lib/ai/provider";

const empty = { problem: "", since: "", age: "", district: "", aadhaar: "", ration_card: "", scheme_card: "" };
const good = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    reply: "धन्यवाद जी. आपले वय किती आहे?",
    language: "mr",
    proposed_stage: 1,
    handover: false,
    handover_reason: "",
    facts: { ...empty, problem: "varicose veins" },
    confidence: 0.9,
    ...over,
  });

function fake(...replies: string[]) {
  const calls: CompletionRequest[] = [];
  const provider: AiProvider = {
    name: "anthropic",
    model: "fake",
    complete: vi.fn(async (req: CompletionRequest) => {
      calls.push(req);
      return { text: replies.shift() ?? "", model: "fake", inputTokens: 10, outputTokens: 5 };
    }),
  };
  return { provider, calls };
}

const input = (body: string, over: Partial<BotTurnInput> = {}): BotTurnInput => ({
  inbound: { type: "text", body },
  history: [],
  knownFacts: {},
  currentStage: 0,
  preferredLanguage: "mr",
  botTurnsWithoutProgress: 0,
  kb: [],
  ...over,
});

describe("runBotTurn", () => {
  it("uses the model reply, saves facts and proposes a forward stage", async () => {
    const { provider } = fake(good());
    const d = await runBotTurn(provider, input("माझ्या पायाच्या नसा फुगल्या आहेत"));
    expect(d.kind).toBe("model");
    expect(d.reply).toContain("वय");
    expect(d.facts).toEqual({ problem: "varicose veins" });
    expect(d.proposedStage).toBe(1);
    expect(d.handover).toBe(false);
  });

  it("emergency: fixed 108 reply without calling the model", async () => {
    const { provider } = fake(good());
    const d = await runBotTurn(provider, input("बाबांना छातीत दुखणे, श्वास घेता येत नाही"));
    expect(d.kind).toBe("emergency");
    expect(d.reply).toContain("108");
    expect(d.handover).toBe(true);
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("'talk to a person' hands over without the model", async () => {
    const { provider } = fake(good());
    const d = await runBotTurn(provider, input("मला माणसाशी बोलायचं आहे"));
    expect(d).toMatchObject({ kind: "handover", handover: true, handoverReason: "asked_for_person" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("repairs invalid JSON once, then succeeds", async () => {
    const { provider, calls } = fake("not json", good());
    const d = await runBotTurn(provider, input("hello"));
    expect(d.kind).toBe("model");
    expect(calls).toHaveLength(2);
    expect(calls[1].messages.at(-1)?.content).toMatch(/not valid/);
  });

  it("falls back and hands over after two invalid outputs", async () => {
    const { provider } = fake("nope", '{"reply": 1}');
    const d = await runBotTurn(provider, input("नमस्कार, मला माहिती हवी आहे"));
    expect(d).toMatchObject({ kind: "fallback", handover: true, handoverReason: "invalid_model_output" });
    expect(d.reply).toBe("आमचे समन्वयक लवकरच आपल्याला फोन करतील.");
  });

  it("blocks medicine advice from the model and hands over", async () => {
    const { provider } = fake(good({ reply: "Paracetamol घ्या जी" }));
    const d = await runBotTurn(provider, input("pain"));
    expect(d.kind).toBe("fallback");
    expect(d.flags).toContain("medicine");
    expect(d.handover).toBe(true);
  });

  it("caps the bot at Eligible and never moves backwards", async () => {
    expect((await runBotTurn(fake(good({ proposed_stage: 4 })).provider, input("x", { currentStage: 3 }))).proposedStage).toBeNull();
    expect((await runBotTurn(fake(good({ proposed_stage: 1 })).provider, input("x", { currentStage: 2 }))).proposedStage).toBeNull();
    expect((await runBotTurn(fake(good({ proposed_stage: 3 })).provider, input("x", { currentStage: 2 }))).proposedStage).toBe(3);
  });

  it("low confidence hands over", async () => {
    const d = await runBotTurn(fake(good({ confidence: 0.2 })).provider, input("x"));
    expect(d).toMatchObject({ kind: "fallback", handoverReason: "low_confidence" });
  });

  it("hands over after 3 turns without progress", async () => {
    const { provider } = fake(good());
    const d = await runBotTurn(provider, input("ok", { botTurnsWithoutProgress: 3 }));
    expect(d.handoverReason).toBe("no_progress");
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("never sends images to the model; classifies by caption", async () => {
    const { provider } = fake(good());
    const d = await runBotTurn(provider, { ...input(""), inbound: { type: "image", body: "आधार कार्ड" } });
    expect(d).toMatchObject({ kind: "document_ack", documentKind: "aadhaar" });
    expect(provider.complete).not.toHaveBeenCalled();
  });

  it("masks Aadhaar-like numbers before they reach the model", async () => {
    const { provider, calls } = fake(good());
    await runBotTurn(provider, input("माझा आधार 1234 5678 9012 आहे"));
    expect(JSON.stringify(calls[0].messages)).not.toContain("1234 5678 9012");
  });

  it("sends at most the last 16 history messages", async () => {
    const { provider, calls } = fake(good());
    const history = Array.from({ length: 30 }, (_, i) => ({
      direction: (i % 2 ? "out" : "in") as "in" | "out",
      body: `m${i}`,
      type: "text",
    }));
    await runBotTurn(provider, input("latest", { history }));
    const sent = calls[0].messages.map((m) => m.content).join("\n");
    expect(sent).not.toContain("m13");
    expect(sent).toContain("m29");
  });
});

describe("sanitiseFacts", () => {
  it("never keeps ID numbers", () => {
    expect(sanitiseFacts({ aadhaar: "1234 5678 9012", ration_card: "yes, orange", age: "45" })).toEqual({
      aadhaar: "yes",
      ration_card: "yes, orange",
      age: "45",
    });
  });
});
