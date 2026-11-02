/** Provider-agnostic interface (CLAUDE.md §3 AI). Adapters: anthropic.ts, gemini.ts, openai-compat.ts. */
export type ChatTurn = { role: "user" | "assistant"; content: string };

export type CompletionRequest = {
  system: string;
  messages: ChatTurn[];
  /** JSON Schema the reply must follow (constrained decoding where the provider supports it). */
  jsonSchema: Record<string, unknown>;
  maxTokens?: number;
  timeoutMs?: number;
};

export type CompletionResult = {
  text: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  refused?: boolean;
};

export interface AiProvider {
  readonly name: "anthropic" | "gemini" | "openai_compat";
  readonly model: string;
  complete(req: CompletionRequest): Promise<CompletionResult>;
}
