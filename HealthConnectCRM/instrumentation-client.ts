import * as Sentry from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    dataCollection: { userInfo: false, cookies: false, httpBodies: [] },
    beforeSend: (event) => scrubEvent(event),
  });
}
