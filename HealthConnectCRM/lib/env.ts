import { z } from "zod";

/** Server-side environment (CLAUDE.md §11). Never import into client components. */
const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(16),
  META_VERIFY_TOKEN: z.string().min(16),
  META_PAGE_ID: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: z.string().min(20),
  META_GRAPH_VERSION: z.string().regex(/^v\d+\.\d+$/, "e.g. v21.0"),
  WA_PHONE_NUMBER_ID: z.string().min(1),
  WA_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WA_ACCESS_TOKEN: z.string().min(20),
  WA_VERIFY_TOKEN: z.string().min(16),
  AI_PROVIDER: z.enum(["anthropic", "gemini"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  INNGEST_EVENT_KEY: z.string().optional(),
  INNGEST_SIGNING_KEY: z.string().optional(),
  SENTRY_DSN: z.string().url().optional().or(z.literal("")),
  APP_BASE_URL: z.string().url(),
});

export type ServerEnv = z.infer<typeof serverSchema>;

const refined = serverSchema.superRefine((env, ctx) => {
  if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ANTHROPIC_API_KEY"], message: "required when AI_PROVIDER=anthropic" });
  }
  if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GEMINI_API_KEY"], message: "required when AI_PROVIDER=gemini" });
  }
});

let cached: ServerEnv | undefined;

/** Parses and caches the environment. Throws listing variable *names* only — never values. */
export function serverEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached && source === process.env) return cached;
  const result = refined.safeParse(source);
  if (!result.success) {
    const names = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`Invalid environment: ${names.join("; ")}`);
  }
  if (source === process.env) cached = result.data;
  return result.data;
}

export function checkEnv(source: NodeJS.ProcessEnv = process.env): { ok: true } | { ok: false; problems: string[] } {
  const result = refined.safeParse(source);
  return result.success ? { ok: true } : { ok: false, problems: result.error.issues.map((i) => i.path.join(".")) };
}

/** Public (browser-safe) values. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
