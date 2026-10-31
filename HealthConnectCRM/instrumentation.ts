import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === "production") {
    // Validate env at boot in production: fail fast rather than run half-configured (CLAUDE.md §10).
    const { serverEnv } = await import("@/lib/env");
    serverEnv();
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
