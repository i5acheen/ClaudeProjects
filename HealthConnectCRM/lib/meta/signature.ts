import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies Meta's X-Hub-Signature-256 header: "sha256=" + hex HMAC-SHA256(rawBody, appSecret).
 * Used by both the Lead Ads and WhatsApp webhooks (same app secret). Constant-time compare.
 */
export function verifyHubSignature(rawBody: string | Buffer, header: string | null, appSecret: string): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const received = Buffer.from(header.slice("sha256=".length), "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export function signBody(rawBody: string, appSecret: string): string {
  return `sha256=${createHmac("sha256", appSecret).update(rawBody).digest("hex")}`;
}

/** GET verification handshake shared by both webhooks. Returns the challenge or null. */
export function verifyChallenge(params: URLSearchParams, verifyToken: string): string | null {
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  if (mode !== "subscribe" || !token || !challenge) return null;
  const a = Buffer.from(token);
  const b = Buffer.from(verifyToken);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return challenge;
}
