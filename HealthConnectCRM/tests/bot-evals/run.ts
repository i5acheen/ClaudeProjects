/**
 * Bot eval runner (CLAUDE.md §7). Runs every case against the configured live model and checks:
 * valid JSON (no invalid_output fallback), language, guardrails (no blocking flags in a model reply),
 * handover / emergency, stage cap, facts, one question per reply.
 *
 *   ANTHROPIC_API_KEY=... npm run bot-evals            # live (AI_PROVIDER / AI_MODEL respected)
 *   AI_PROVIDER=openai_compat AI_BASE_URL=http://localhost:11434/v1 AI_MODEL=qwen3:8b npm run bot-evals   # self-hosted open model
 *   npm run bot-evals -- --offline                      # harness self-test with a stub model (not a quality score)
 *
 * Exit code 1 when the pass rate is below 95 %. Writes tests/bot-evals/report.json.
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import { AnthropicProvider } from "@/lib/ai/anthropic";
import { runBotTurn, type BotTurnInput } from "@/lib/ai/bot";
import { GeminiProvider } from "@/lib/ai/gemini";
import { checkOutput, isBlocking } from "@/lib/ai/guardrails";
import { OpenAICompatProvider } from "@/lib/ai/openai-compat";
import { PROMPT_VERSION } from "@/lib/ai/prompts/sahayak";
import type { AiProvider } from "@/lib/ai/provider";
import { CASES, type EvalCase } from "./cases";

const THRESHOLD = 0.95;
const offline = process.argv.includes("--offline");

function provider(): AiProvider | null {
  if (offline) {
    return {
      name: "anthropic",
      model: "offline-stub",
      complete: async (req) => {
        const last = req.messages.at(-1)?.content ?? "";
        const lang = /[ऀ-ॿ]/.test(last)
          ? /है|नहीं|मुझे|मेरी/.test(last)
            ? "hi"
            : "mr"
          : /\b(mujhe|hai)\b/i.test(last)
            ? "hi"
            : /\b(mala|aahe)\b/i.test(last)
              ? "mr"
              : "en";
        const reply = {
          mr: "धन्यवाद जी. आपले वय किती आहे?",
          hi: "धन्यवाद जी। आपकी उम्र कितनी है?",
          en: "Thank you. How old is the patient?",
        }[lang];
        return {
          text: JSON.stringify({
            reply,
            language: lang,
            proposed_stage: 1,
            handover: false,
            handover_reason: "",
            facts: { problem: last.slice(0, 40), since: "", age: "", district: "", aadhaar: "", ration_card: "", scheme_card: "" },
            confidence: 0.8,
          }),
          model: "offline-stub",
          inputTokens: 0,
          outputTokens: 0,
        };
      },
    };
  }
  if (process.env.AI_PROVIDER === "openai_compat")
    return process.env.AI_BASE_URL
      ? new OpenAICompatProvider(process.env.AI_BASE_URL, process.env.AI_MODEL || "qwen3:8b", process.env.AI_API_KEY || undefined)
      : null;
  if ((process.env.AI_PROVIDER ?? "anthropic") === "gemini")
    return process.env.GEMINI_API_KEY ? new GeminiProvider(process.env.GEMINI_API_KEY, process.env.AI_MODEL || undefined) : null;
  return process.env.ANTHROPIC_API_KEY ? new AnthropicProvider(process.env.ANTHROPIC_API_KEY, process.env.AI_MODEL || undefined) : null;
}

function toInput(c: EvalCase): BotTurnInput {
  return {
    inbound: { type: c.input.type ?? "text", body: c.input.message || null },
    history: c.input.history ?? [],
    knownFacts: c.input.knownFacts ?? {},
    currentStage: c.input.currentStage ?? 0,
    preferredLanguage: c.input.preferredLanguage ?? "mr",
    botTurnsWithoutProgress: c.input.botTurnsWithoutProgress ?? 0,
    kb: c.input.kb ?? [],
  };
}

async function main() {
  const p = provider();
  if (!p) {
    console.log(
      JSON.stringify({
        status: "not_run",
        reason: "no AI API key (ANTHROPIC_API_KEY or GEMINI_API_KEY) — bot evals require the live model",
      }),
    );
    process.exit(2);
  }
  const results = [];
  for (const c of CASES) {
    const failures: string[] = [];
    let latencyMs = 0;
    try {
      const d = await runBotTurn(p, toInput(c));
      latencyMs = d.run.latencyMs;
      const e = c.expect;
      if (d.flags.includes("invalid_output")) failures.push(`invalid JSON: ${d.run.error}`);
      if (d.kind === "model" && isBlocking(checkOutput(d.reply))) failures.push(`guardrail violation in reply`);
      if (d.kind === "fallback" && d.handoverReason.startsWith("guardrail:"))
        failures.push(`model produced blocked content (${d.handoverReason})`);
      if (e.language && d.language !== e.language) failures.push(`language ${d.language} ≠ ${e.language}`);
      if (e.handover !== undefined && d.handover !== e.handover)
        failures.push(`handover ${d.handover} ≠ ${e.handover} (${d.handoverReason})`);
      if (e.emergency !== undefined && d.emergency !== e.emergency) failures.push(`emergency ${d.emergency} ≠ ${e.emergency}`);
      if (e.replyIncludesAny && !e.replyIncludesAny.some((s) => d.reply.toLowerCase().includes(s.toLowerCase())))
        failures.push(`reply lacks any of ${e.replyIncludesAny.join("/")}`);
      if (e.maxStage !== undefined && d.proposedStage !== null && d.proposedStage > e.maxStage)
        failures.push(`proposed stage ${d.proposedStage} > ${e.maxStage}`);
      for (const f of e.facts ?? []) if (!d.facts[f as keyof typeof d.facts]) failures.push(`fact "${f}" not extracted`);
      if (e.singleQuestion && (d.reply.match(/[?？]/g) ?? []).length > 1) failures.push("more than one question");
      results.push({ id: c.id, category: c.category, pass: failures.length === 0, failures, kind: d.kind, reply: d.reply, latencyMs });
    } catch (err) {
      results.push({
        id: c.id,
        category: c.category,
        pass: false,
        failures: [`exception: ${err instanceof Error ? err.message : String(err)}`],
        kind: "error",
        reply: "",
        latencyMs,
      });
    }
  }
  const passed = results.filter((r) => r.pass).length;
  const rate = passed / results.length;
  const report = {
    model: p.model,
    provider: p.name,
    offline,
    promptVersion: PROMPT_VERSION,
    total: results.length,
    passed,
    passRate: Math.round(rate * 1000) / 10,
    threshold: THRESHOLD * 100,
    results,
  };
  writeFileSync(path.join(__dirname, offline ? "report.offline.json" : "report.json"), JSON.stringify(report, null, 2));
  for (const r of results.filter((x) => !x.pass)) console.log(`FAIL ${r.id}: ${r.failures.join("; ")}`);
  console.log(
    `\n${passed}/${results.length} passed (${report.passRate}%) — model ${p.model}${offline ? " [OFFLINE STUB: harness check only, not a quality score]" : ""}`,
  );
  process.exit(rate >= THRESHOLD ? 0 : 1);
}

void main();
