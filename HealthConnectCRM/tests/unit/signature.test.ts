import { describe, expect, it } from "vitest";
import { signBody, verifyChallenge, verifyHubSignature } from "@/lib/meta/signature";

const secret = "test-app-secret-1234567890";

describe("verifyHubSignature", () => {
  const body = JSON.stringify({ object: "page", entry: [] });
  it("accepts a correct signature", () => {
    expect(verifyHubSignature(body, signBody(body, secret), secret)).toBe(true);
  });
  it("rejects a signature made with another secret", () => {
    expect(verifyHubSignature(body, signBody(body, "other-secret-xxxxxxxx"), secret)).toBe(false);
  });
  it("rejects a tampered body", () => {
    expect(verifyHubSignature(body + " ", signBody(body, secret), secret)).toBe(false);
  });
  it("rejects missing, malformed and wrong-length headers", () => {
    expect(verifyHubSignature(body, null, secret)).toBe(false);
    expect(verifyHubSignature(body, "sha1=abc", secret)).toBe(false);
    expect(verifyHubSignature(body, "sha256=abcd", secret)).toBe(false);
  });
});

describe("verifyChallenge", () => {
  const token = "verify-token-0123456789";
  it("returns the challenge for a matching token", () => {
    const p = new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": token, "hub.challenge": "42" });
    expect(verifyChallenge(p, token)).toBe("42");
  });
  it("rejects a wrong token or mode", () => {
    expect(verifyChallenge(new URLSearchParams({ "hub.mode": "subscribe", "hub.verify_token": "nope", "hub.challenge": "42" }), token)).toBeNull();
    expect(verifyChallenge(new URLSearchParams({ "hub.mode": "unsubscribe", "hub.verify_token": token, "hub.challenge": "42" }), token)).toBeNull();
  });
});
