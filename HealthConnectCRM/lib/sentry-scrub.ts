import { redact } from "@/lib/log";

/** Sentry beforeSend: patient data must not leave India in error reports (docs/PRODUCTION.md §6). */
export function scrubEvent<
  T extends { request?: { data?: unknown; cookies?: unknown; headers?: unknown }; user?: unknown; extra?: unknown; breadcrumbs?: unknown },
>(event: T): T {
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    event.request.headers = redact(event.request.headers) as typeof event.request.headers;
  }
  delete event.user;
  if (event.extra) event.extra = redact(event.extra);
  if (event.breadcrumbs) event.breadcrumbs = redact(event.breadcrumbs);
  return event;
}
