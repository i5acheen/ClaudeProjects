import { z } from "zod";
import { fetchWithTimeout } from "@/lib/utils";
import type { AiProvider, CompletionRequest, CompletionResult } from "./provider";

/**
 * Adapter for any OpenAI-compatible chat endpoint — used to run an open-weight model you host yourself
 * (Ollama, vLLM, llama.cpp server, LocalAI) so patient conversations never leave your server.
 * Structured output is requested via `response_format: json_schema`; replies are still zod-validated
 * by the bot, with the usual repair retry and safe fallback.
 */
const responseSchema = z.object({
  model: z.string().optional(),
  choices: z
    .array(z.object({ message: z.object({ content: z.string().nullable() }), finish_reason: z.string().nullable().optional() }))
    .min(1),
  usage: z.object({ prompt_tokens: z.number().optional(), completion_tokens: z.number().optional() }).optional(),
});

export class OpenAICompatProvider implements AiProvider {
  readonly name = "openai_compat" as const;

  constructor(
    private readonly baseUrl: string,
    readonly model: string,
    private readonly apiKey?: string,
  ) {}

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const res = await fetchWithTimeout(
      `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}) },
        body: JSON.stringify({
          model: this.model,
          messages: [{ role: "system", content: req.system }, ...req.messages],
          response_format: { type: "json_schema", json_schema: { name: "bot_output", schema: req.jsonSchema, strict: true } },
          max_tokens: req.maxTokens ?? 1000,
          temperature: 0.2,
          stream: false,
        }),
      },
      req.timeoutMs ?? 8000,
    );
    if (!res.ok) throw new Error(`model server ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    const json = responseSchema.parse(await res.json());
    return {
      text: json.choices[0].message.content ?? "",
      model: json.model ?? this.model,
      inputTokens: json.usage?.prompt_tokens ?? null,
      outputTokens: json.usage?.completion_tokens ?? null,
    };
  }
}
