import { istHour } from "@/lib/utils";

/**
 * Pure send policy (CLAUDE.md §6.2, §9). Every outbound message is checked here
 * before it reaches the API; the decision is logged with the attempt.
 */
export type SendKind = "text" | "template" | "media";

export type SendContext = {
  kind: SendKind;
  now: Date;
  windowExpiresAt: Date | null;
  optedOutAt: Date | null;
  consentWhatsapp: boolean;
  /** Template category; marketing needs explicit consent. */
  templateCategory?: "utility" | "marketing" | "authentication";
  /** Opt-out confirmation is the one message allowed after opting out. */
  isOptOutConfirmation?: boolean;
  /** Coordinator-initiated replies inside the window are allowed during quiet hours. */
  isReplyToPatient?: boolean;
};

export type SendDecision =
  | { allow: true }
  | { allow: false; reason: "opted_out" | "window_closed" | "no_consent" | "quiet_hours"; retryAt?: Date };

export const QUIET_START_HOUR = 21; // 9 pm IST
export const QUIET_END_HOUR = 8; // 8 am IST

export function isQuietHours(now: Date): boolean {
  const h = istHour(now);
  return h >= QUIET_START_HOUR || h < QUIET_END_HOUR;
}

/** Next 8:00 IST strictly after `now`. */
export function nextQuietEnd(now: Date): Date {
  const istOffsetMs = 5.5 * 3600_000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const target = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate(), QUIET_END_HOUR, 0, 0));
  if (ist.getUTCHours() >= QUIET_END_HOUR) target.setUTCDate(target.getUTCDate() + 1);
  return new Date(target.getTime() - istOffsetMs);
}

export function decideSend(ctx: SendContext): SendDecision {
  if (ctx.optedOutAt && !ctx.isOptOutConfirmation) return { allow: false, reason: "opted_out" };

  const windowOpen = !!ctx.windowExpiresAt && ctx.windowExpiresAt.getTime() > ctx.now.getTime();
  if (ctx.kind !== "template" && !windowOpen) return { allow: false, reason: "window_closed" };

  if (ctx.kind === "template") {
    if (!ctx.consentWhatsapp) return { allow: false, reason: "no_consent" };
  }

  // Quiet hours apply to proactive messages. A direct reply inside an open window
  // (patient just wrote to us) is not proactive.
  const proactive = !(windowOpen && ctx.isReplyToPatient) && !ctx.isOptOutConfirmation;
  if (proactive && isQuietHours(ctx.now)) return { allow: false, reason: "quiet_hours", retryAt: nextQuietEnd(ctx.now) };

  return { allow: true };
}
