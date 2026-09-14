import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const EnvSchema = z.object({
  REDDIT_CLIENT_ID: z.string().min(1, "REDDIT_CLIENT_ID is required"),
  REDDIT_CLIENT_SECRET: z.string().min(1, "REDDIT_CLIENT_SECRET is required"),
  REDDIT_USER_AGENT: z.string().min(1, "REDDIT_USER_AGENT is required"),
  YOUTUBE_API_KEY: z.string().optional(),
  CACHE_DB_PATH: z.string().default("./data/cache.sqlite"),
});

export type Env = z.infer<typeof EnvSchema>;

let cachedEnv: Env | undefined;

/**
 * Validates and returns process env config on first access. Throws a
 * descriptive error (rather than crashing with a raw Zod trace) if
 * required credentials are missing, so the server can report a clean
 * startup failure.
 */
export function getConfig(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment configuration:\n${issues}\n\n` +
        `Copy .env.example to .env and fill in the required values. See README.md for setup instructions.`
    );
  }

  cachedEnv = parsed.data;
  return cachedEnv;
}
