import "server-only";
import { serverEnv } from "@/lib/env";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import { OpenAICompatProvider } from "./openai-compat";
import type { AiProvider } from "./provider";

/** null when AI_PROVIDER=none (default): the WhatsApp side runs on fixed rules only. */
export function aiProvider(): AiProvider | null {
  const env = serverEnv();
  if (env.AI_PROVIDER === "none") return null;
  const model = process.env.AI_MODEL || undefined;
  if (env.AI_PROVIDER === "openai_compat")
    return new OpenAICompatProvider(env.AI_BASE_URL ?? "", model ?? "qwen3:8b", env.AI_API_KEY || undefined);
  if (env.AI_PROVIDER === "gemini") return new GeminiProvider(env.GEMINI_API_KEY ?? "", model);
  return new AnthropicProvider(env.ANTHROPIC_API_KEY ?? "", model);
}
