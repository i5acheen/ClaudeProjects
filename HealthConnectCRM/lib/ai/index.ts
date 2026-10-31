import "server-only";
import { serverEnv } from "@/lib/env";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import type { AiProvider } from "./provider";

export function aiProvider(): AiProvider {
  const env = serverEnv();
  const model = process.env.AI_MODEL || undefined;
  if (env.AI_PROVIDER === "gemini") return new GeminiProvider(env.GEMINI_API_KEY ?? "", model);
  return new AnthropicProvider(env.ANTHROPIC_API_KEY ?? "", model);
}
