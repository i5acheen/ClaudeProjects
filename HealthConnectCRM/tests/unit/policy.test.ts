import { describe, expect, it } from "vitest";
import { decideSend, isQuietHours, nextQuietEnd } from "@/lib/whatsapp/policy";

// 2026-10-30 12:00 IST = 06:30 UTC; 22:00 IST = 16:30 UTC
const noonIst = new Date("2026-10-30T06:30:00Z");
const tenPmIst = new Date("2026-10-30T16:30:00Z");
const inOneHour = (d: Date) => new Date(d.getTime() + 3600_000);
const base = { optedOutAt: null, consentWhatsapp: true } as const;

describe("decideSend", () => {
  it("allows free text inside the 24 h window", () => {
    expect(decideSend({ ...base, kind: "text", now: noonIst, windowExpiresAt: inOneHour(noonIst) })).toEqual({ allow: true });
  });
  it("refuses free text when the window is closed or never opened", () => {
    expect(decideSend({ ...base, kind: "text", now: noonIst, windowExpiresAt: new Date(noonIst.getTime() - 1) })).toMatchObject({
      allow: false,
      reason: "window_closed",
    });
    expect(decideSend({ ...base, kind: "text", now: noonIst, windowExpiresAt: null })).toMatchObject({
      allow: false,
      reason: "window_closed",
    });
  });
  it("allows templates outside the window with consent", () => {
    expect(decideSend({ ...base, kind: "template", templateCategory: "utility", now: noonIst, windowExpiresAt: null })).toEqual({
      allow: true,
    });
  });
  it("refuses templates without consent", () => {
    expect(decideSend({ ...base, consentWhatsapp: false, kind: "template", now: noonIst, windowExpiresAt: null })).toMatchObject({
      reason: "no_consent",
    });
  });
  it("never messages opted-out patients, except the single confirmation", () => {
    const optedOutAt = new Date(noonIst.getTime() - 1000);
    expect(decideSend({ ...base, optedOutAt, kind: "text", now: noonIst, windowExpiresAt: inOneHour(noonIst) })).toMatchObject({
      reason: "opted_out",
    });
    expect(decideSend({ ...base, optedOutAt, kind: "template", now: noonIst, windowExpiresAt: null })).toMatchObject({
      reason: "opted_out",
    });
    expect(
      decideSend({ ...base, optedOutAt, kind: "text", isOptOutConfirmation: true, now: tenPmIst, windowExpiresAt: inOneHour(tenPmIst) }),
    ).toEqual({ allow: true });
  });
  it("queues proactive messages during quiet hours until 8 am IST", () => {
    const d = decideSend({ ...base, kind: "template", now: tenPmIst, windowExpiresAt: null });
    expect(d).toMatchObject({ allow: false, reason: "quiet_hours" });
    if (!d.allow) expect(d.retryAt?.toISOString()).toBe("2026-10-31T02:30:00.000Z");
  });
  it("allows a direct reply to a patient during quiet hours", () => {
    expect(decideSend({ ...base, kind: "text", isReplyToPatient: true, now: tenPmIst, windowExpiresAt: inOneHour(tenPmIst) })).toEqual({
      allow: true,
    });
  });
});

describe("quiet hours", () => {
  it("is 21:00–08:00 IST", () => {
    expect(isQuietHours(new Date("2026-10-30T15:29:00Z"))).toBe(false); // 20:59 IST
    expect(isQuietHours(new Date("2026-10-30T15:30:00Z"))).toBe(true); // 21:00 IST
    expect(isQuietHours(new Date("2026-10-31T02:29:00Z"))).toBe(true); // 07:59 IST
    expect(isQuietHours(new Date("2026-10-31T02:30:00Z"))).toBe(false); // 08:00 IST
  });
  it("next 8 am from just after midnight IST is the same day", () => {
    expect(nextQuietEnd(new Date("2026-10-30T19:00:00Z")).toISOString()).toBe("2026-10-31T02:30:00.000Z"); // 00:30 IST on 31st
  });
});
