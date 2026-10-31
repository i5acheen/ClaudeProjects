import Anthropic from "@anthropic-ai/sdk";
import type { AiProvider, CompletionRequest, CompletionResult } from "./provider";

/**
 * Anthropic adapter. Uses a paid API key (API terms: inputs/outputs are not used for training).
 * Structured outputs constrain the reply to the bot JSON schema; refusals fall back server-side.
 * Effort "low": short conversational turns with a < 10 s latency budget.
 */
export const DEFAULT_ANTHROPIC_MODEL = "claude-opus-5-5";

export class AnthropicProvider implements AiProvider {
  readonly name = "anthropic" as const;
  private client: Anthropic;

  constructor(
    apiKey: string,
    readonly model: string = DEFAULT_ANTHROPIC_MODEL,
  ) {
    this.client = new Anthropic({ apiKey, maxRetries: 1 });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const response = await this.client.beta.messages.create(
      {
        model: this.model,
        max_tokens: req.maxTokens ?? 2000,
        system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
        messages: req.messages,
        output_config: { effort: "low", format: { type: "json_schema", schema: req.jsonSchema } },
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { timeout: req.timeoutMs ?? 8000 },
    );
    if (response.stop_reason === "refusal") {
      return {
        text: "",
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        refused: true,
      };
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, model: response.model, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  }
}
