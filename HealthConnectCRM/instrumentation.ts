import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Validate env at boot (CLAUDE.md §10). Report loudly instead of crashing the whole app: public pages
    // (privacy policy, needed by Meta) and /api/health must stay up, and every code path that needs a
    // secret calls serverEnv(), which throws, so nothing runs half-configured.
    const { checkEnv } = await import("@/lib/env");
    const result = checkEnv();
    if (!result.ok) {
      const { log } = await import("@/lib/log");
      log.error("env.invalid_at_boot", { invalid: result.problems });
    }
  }
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.VERCEL_ENV ?? "development",
      tracesSampleRate: 0.1,
      dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
      beforeSend: (event) => scrubEvent(event),
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
