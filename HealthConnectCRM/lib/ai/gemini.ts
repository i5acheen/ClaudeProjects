import { GoogleGenAI } from "@google/genai";
import type { AiProvider, CompletionRequest, CompletionResult } from "./provider";

/** Gemini adapter. Use only with a paid-tier key: the free tier may use content to improve Google's models. */
export const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";

export class GeminiProvider implements AiProvider {
  readonly name = "gemini" as const;
  private client: GoogleGenAI;

  constructor(
    apiKey: string,
    readonly model: string = DEFAULT_GEMINI_MODEL,
  ) {
    this.client = new GoogleGenAI({ apiKey });
  }

  async complete(req: CompletionRequest): Promise<CompletionResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), req.timeoutMs ?? 8000);
    try {
      const res = await this.client.models.generateContent({
        model: this.model,
        contents: req.messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        config: {
          systemInstruction: req.system,
          responseMimeType: "application/json",
          responseJsonSchema: req.jsonSchema,
          maxOutputTokens: req.maxTokens ?? 2000,
          abortSignal: controller.signal,
        },
      });
      return {
        text: res.text ?? "",
        model: this.model,
        inputTokens: res.usageMetadata?.promptTokenCount ?? null,
        outputTokens: res.usageMetadata?.candidatesTokenCount ?? null,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
