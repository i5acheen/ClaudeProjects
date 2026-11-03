import { z } from "zod";

/**
 * Server-side environment (CLAUDE.md §11), validated in three groups so the CRM can go live before every
 * integration is ready:
 *  - core (database, app URL, AI mode, jobs, errors) — required for the app to run;
 *  - Meta Lead Ads — checked only by the Meta webhook and backfill;
 *  - WhatsApp — checked only when sending/receiving WhatsApp.
 * Errors list variable *names* only — never values. Never import into client components.
 */
type EnvSource = Record<string, string | undefined>;
const optionalUrl = z.string().url().optional().or(z.literal(""));

const coreSchema = z
  .object({
    NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
    APP_BASE_URL: z.string().url(),
    AI_PROVIDER: z.enum(["none", "anthropic", "gemini", "openai_compat"]).default("none"),
    AI_BASE_URL: optionalUrl,
    AI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    INNGEST_EVENT_KEY: z.string().optional(),
    INNGEST_SIGNING_KEY: z.string().optional(),
    SENTRY_DSN: optionalUrl,
  })
  .superRefine((env, ctx) => {
    if (env.AI_PROVIDER === "anthropic" && !env.ANTHROPIC_API_KEY)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["ANTHROPIC_API_KEY"], message: "required when AI_PROVIDER=anthropic" });
    if (env.AI_PROVIDER === "openai_compat" && !env.AI_BASE_URL)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["AI_BASE_URL"], message: "required when AI_PROVIDER=openai_compat" });
    if (env.AI_PROVIDER === "gemini" && !env.GEMINI_API_KEY)
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GEMINI_API_KEY"], message: "required when AI_PROVIDER=gemini" });
  });

const graphVersion = z.string().regex(/^v\d+\.\d+$/, "e.g. v21.0");

const metaSchema = z.object({
  META_APP_ID: z.string().min(1),
  META_APP_SECRET: z.string().min(16),
  META_VERIFY_TOKEN: z.string().min(16),
  META_PAGE_ID: z.string().min(1),
  META_PAGE_ACCESS_TOKEN: z.string().min(20),
  META_GRAPH_VERSION: graphVersion,
});

const waSchema = z.object({
  META_APP_SECRET: z.string().min(16), // WhatsApp webhooks are signed with the Meta app secret
  META_GRAPH_VERSION: graphVersion,
  WA_PHONE_NUMBER_ID: z.string().min(1),
  WA_BUSINESS_ACCOUNT_ID: z.string().min(1),
  WA_ACCESS_TOKEN: z.string().min(20),
  WA_VERIFY_TOKEN: z.string().min(16),
});

export type CoreEnv = z.infer<typeof coreSchema>;
export type MetaEnv = z.infer<typeof metaSchema>;
export type WaEnv = z.infer<typeof waSchema>;

/** Thrown when an integration is used before its settings are filled in. */
export class NotConfiguredError extends Error {
  constructor(
    readonly integration: "core" | "meta" | "whatsapp",
    readonly missing: string[],
  ) {
    super(`${integration} is not configured: ${missing.join(", ")}`);
  }
}

function parse<S extends z.ZodTypeAny>(schema: S, name: "core" | "meta" | "whatsapp", source: EnvSource): z.infer<S> {
  const r = schema.safeParse(source);
  if (!r.success)
    throw new NotConfiguredError(
      name,
      r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
    );
  return r.data;
}

/** Database, app URL, AI mode. Required everywhere on the server. */
export function coreEnv(source: EnvSource = process.env): CoreEnv {
  return parse(coreSchema, "core", source);
}
export function metaEnv(source: EnvSource = process.env): MetaEnv {
  return parse(metaSchema, "meta", source);
}
export function waEnv(source: EnvSource = process.env): WaEnv {
  return parse(waSchema, "whatsapp", source);
}

export type EnvReport = { core: string[]; meta: string[]; whatsapp: string[] };

/** Names of invalid/missing variables per group (empty array = configured). */
export function checkEnv(source: EnvSource = process.env): EnvReport {
  const names = (schema: z.ZodTypeAny) => {
    const r = schema.safeParse(source);
    return r.success ? [] : [...new Set(r.error.issues.map((i) => i.path.join(".")))];
  };
  return { core: names(coreSchema), meta: names(metaSchema), whatsapp: names(waSchema) };
}

/** Public (browser-safe) values. */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
};
