import { describe, expect, it } from "vitest";
import { fromWaId, maskNumbersForPrompt, maskPhone, toE164 } from "@/lib/phone";

describe("toE164", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["0091-98765-43210", "+919876543210"],
  ])("%s → %s", (input, out) => expect(toE164(input)).toBe(out));

  it.each(["12345", "5876543210", "+91 12345 67890", "", "abc"])("rejects %s", (input) => expect(toE164(input)).toBeNull());
  it("parses WhatsApp ids", () => expect(fromWaId("919876543210")).toBe("+919876543210"));
});

describe("masking", () => {
  it("masks list phones as +91 98XXX XX214", () => expect(maskPhone("+919812345214")).toBe("+91 98XXX XX214"));
  it("masks anonymised patients", () => expect(maskPhone("anon:123")).toBe("—"));
  it("masks long numbers in prompt text", () => {
    const out = maskNumbersForPrompt("my aadhaar is 1234 5678 9012 and age 45");
    expect(out).not.toMatch(/1234/);
    expect(out).toContain("[number ending 12]");
    expect(out).toContain("45");
  });
});
