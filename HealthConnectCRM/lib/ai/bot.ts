import { botMayMove } from "@/lib/stages";
import { maskNumbersForPrompt } from "@/lib/phone";
import {
  EMERGENCY_REPLY,
  FALLBACK_REPLY,
  HANDOVER_REPLY,
  checkInput,
  checkOutput,
  guessLanguage,
  isBlocking,
  stripMarkdown,
} from "./guardrails";
import { PROMPT_VERSION, buildSystemPrompt, repairPrompt } from "./prompts/sahayak";
import type { AiProvider, ChatTurn } from "./provider";
import { FACT_KEYS, botOutputJsonSchema, parseBotOutput, type BotOutput, type FactKey } from "./schema";

export const HISTORY_LIMIT = 16;
export const MIN_CONFIDENCE = 0.5;
export const MAX_TURNS_WITHOUT_PROGRESS = 3;

export type Lang = "mr" | "hi" | "en";
export type HistoryMessage = { direction: "in" | "out"; body: string | null; type: string };

export type BotTurnInput = {
  inbound: { type: "text" | "image" | "document" | "audio" | "interactive"; body: string | null };
  history: HistoryMessage[];
  knownFacts: Partial<Record<FactKey, string>>;
  currentStage: number;
  preferredLanguage: Lang;
  botTurnsWithoutProgress: number;
  kb: { title: string; body: string }[];
};

export type BotDecision = {
  kind: "emergency" | "handover" | "model" | "fallback" | "document_ack";
  reply: string;
  language: Lang;
  handover: boolean;
  handoverReason: string;
  emergency: boolean;
  facts: Partial<Record<FactKey, string>>;
  proposedStage: number | null;
  documentKind: "aadhaar" | "ration_card" | "scheme_card" | "prescription" | "report" | "other" | null;
  flags: string[];
  run: {
    model: string | null;
    promptVersion: string;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    output: BotOutput | null;
    error: string | null;
  };
};

const DOC_ACK: Record<Lang, string> = {
  mr: "धन्यवाद जी, आपला फोटो मिळाला. आमचे समन्वयक तो तपासतील. अजून कोणते कागदपत्र असल्यास कृपया पाठवा.",
  hi: "धन्यवाद जी, आपकी फ़ोटो मिल गई। हमारे समन्वयक इसे जाँचेंगे। और कोई दस्तावेज़ हो तो कृपया भेजें।",
  en: "Thank you, we received your photo. Our coordinator will check it. Please send any other documents too.",
};

/** Caption-only classification: the image itself is never sent to the model (CLAUDE.md §7). */
export function classifyDocument(caption: string | null): BotDecision["documentKind"] {
  const c = (caption ?? "").toLowerCase();
  if (/aadha?ar|आधार/.test(c)) return "aadhaar";
  if (/ration|रेशन|राशन/.test(c)) return "ration_card";
  if (/ayushman|mjp|jyotiba|scheme|आयुष्मान|योजना|गोल्डन|golden/.test(c)) return "scheme_card";
  if (/prescription|प्रिस्क्रिप्शन|पर्ची|चिठ्ठी/.test(c)) return "prescription";
  if (/report|रिपोर्ट|अहवाल|mri|x-?ray|scan/.test(c)) return "report";
  return "other";
}

/** Facts never carry ID numbers: anything with a long digit run becomes "yes". */
export function sanitiseFacts(facts: Partial<Record<FactKey, string>>): Partial<Record<FactKey, string>> {
  const out: Partial<Record<FactKey, string>> = {};
  for (const key of FACT_KEYS) {
    const v = facts[key]?.trim();
    if (!v) continue;
    out[key] =
      (key === "aadhaar" || key === "ration_card" || key === "scheme_card") && /\d{6,}/.test(v.replace(/\s|-/g, ""))
        ? "yes"
        : v.slice(0, 200);
  }
  return out;
}

function toTurns(history: HistoryMessage[]): ChatTurn[] {
  const turns: ChatTurn[] = [];
  for (const m of history.slice(-HISTORY_LIMIT)) {
    const content = m.body ? maskNumbersForPrompt(m.body) : `[${m.type}]`;
    const role = m.direction === "in" ? "user" : "assistant";
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.content += `\n${content}`;
    else turns.push({ role, content });
  }
  while (turns.length && turns[0].role !== "user") turns.shift();
  return turns;
}

function base(input: BotTurnInput, language: Lang): Omit<BotDecision, "kind" | "reply" | "handover" | "handoverReason"> {
  return {
    language,
    emergency: false,
    facts: {},
    proposedStage: null,
    documentKind: null,
    flags: [],
    run: { model: null, promptVersion: PROMPT_VERSION, latencyMs: 0, inputTokens: null, outputTokens: null, output: null, error: null },
  };
}

export async function runBotTurn(provider: AiProvider, input: BotTurnInput): Promise<BotDecision> {
  const text = input.inbound.body ?? "";
  const language = text ? guessLanguage(text, input.preferredLanguage) : input.preferredLanguage;
  const check = checkInput(text);

  // 1. Emergencies: fixed reply, no model.
  if (check.emergency) {
    return {
      ...base(input, language),
      kind: "emergency",
      reply: EMERGENCY_REPLY[language],
      handover: true,
      handoverReason: "emergency",
      emergency: true,
      flags: ["emergency"],
    };
  }

  // 2. Deterministic handover triggers.
  const trigger = check.wantsHuman
    ? "asked_for_person"
    : check.angry
      ? "angry"
      : check.medicalQuestion
        ? "medical_question"
        : check.moneyQuestion
          ? "money_question"
          : null;
  if (trigger) {
    return {
      ...base(input, language),
      kind: "handover",
      reply: HANDOVER_REPLY[language],
      handover: true,
      handoverReason: trigger,
      flags: [trigger],
    };
  }

  // 3. Media: never sent to the model.
  if (input.inbound.type === "image" || input.inbound.type === "document") {
    return {
      ...base(input, language),
      kind: "document_ack",
      reply: DOC_ACK[language],
      handover: false,
      handoverReason: "",
      documentKind: classifyDocument(input.inbound.body),
    };
  }
  if (input.inbound.type === "audio") {
    return {
      ...base(input, language),
      kind: "handover",
      reply: HANDOVER_REPLY[language],
      handover: true,
      handoverReason: "voice_note",
      flags: ["audio"],
    };
  }

  // 4. No progress for too long.
  if (input.botTurnsWithoutProgress >= MAX_TURNS_WITHOUT_PROGRESS) {
    return {
      ...base(input, language),
      kind: "handover",
      reply: HANDOVER_REPLY[language],
      handover: true,
      handoverReason: "no_progress",
      flags: ["no_progress"],
    };
  }

  // 5. Model turn with one repair retry.
  const system = buildSystemPrompt({
    knownFacts: input.knownFacts,
    currentStage: input.currentStage,
    preferredLanguage: input.preferredLanguage,
    kb: input.kb,
  });
  const messages = toTurns([...input.history, { direction: "in", body: text, type: input.inbound.type }]);
  const started = Date.now();
  const run: BotDecision["run"] = { ...base(input, language).run };
  let output: BotOutput | null = null;
  try {
    let res = await provider.complete({ system, messages, jsonSchema: botOutputJsonSchema });
    run.model = res.model;
    run.inputTokens = res.inputTokens;
    run.outputTokens = res.outputTokens;
    let parsed = res.refused ? ({ ok: false, error: "refused" } as const) : parseBotOutput(res.text);
    if (!parsed.ok && !res.refused) {
      res = await provider.complete({
        system,
        messages: [...messages, { role: "assistant", content: res.text || "{}" }, { role: "user", content: repairPrompt(parsed.error) }],
        jsonSchema: botOutputJsonSchema,
      });
      run.inputTokens = (run.inputTokens ?? 0) + (res.inputTokens ?? 0);
      run.outputTokens = (run.outputTokens ?? 0) + (res.outputTokens ?? 0);
      parsed = res.refused ? ({ ok: false, error: "refused" } as const) : parseBotOutput(res.text);
    }
    if (parsed.ok) output = parsed.value;
    else run.error = parsed.error;
  } catch (e) {
    run.error = e instanceof Error ? e.message : String(e);
  }
  run.latencyMs = Date.now() - started;
  run.output = output;

  if (!output) {
    return {
      ...base(input, language),
      kind: "fallback",
      reply: FALLBACK_REPLY[language],
      handover: true,
      handoverReason: "invalid_model_output",
      flags: ["invalid_output"],
      run,
    };
  }

  // 6. Post-generation checks.
  const outFlags = checkOutput(output.reply);
  const replyLang = output.language;
  if (isBlocking(outFlags)) {
    return {
      ...base(input, replyLang),
      kind: "fallback",
      reply: FALLBACK_REPLY[replyLang],
      handover: true,
      handoverReason: `guardrail:${outFlags.join(",")}`,
      flags: outFlags,
      facts: sanitiseFacts(output.facts),
      run,
    };
  }
  if (output.confidence < MIN_CONFIDENCE) {
    return {
      ...base(input, replyLang),
      kind: "fallback",
      reply: FALLBACK_REPLY[replyLang],
      handover: true,
      handoverReason: "low_confidence",
      flags: [...outFlags, "low_confidence"],
      facts: sanitiseFacts(output.facts),
      run,
    };
  }

  const proposedStage = botMayMove(input.currentStage, output.proposed_stage) ? output.proposed_stage : null;
  return {
    ...base(input, replyLang),
    kind: "model",
    reply: stripMarkdown(output.reply),
    handover: output.handover,
    handoverReason: output.handover ? output.handover_reason || "model_requested" : "",
    facts: sanitiseFacts(output.facts),
    proposedStage,
    flags: outFlags,
    run,
  };
}
