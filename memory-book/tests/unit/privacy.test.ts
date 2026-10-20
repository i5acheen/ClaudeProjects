import { describe, expect, it } from "vitest";
import { scrubReport, scrubText } from "@/lib/monitoring/scrub";
import { contentSecurityPolicy } from "@/lib/security/csp";
import { isPublicPermission } from "@/lib/drive/client";
import { samePhoto } from "@/lib/photo-hash";

describe("error reports keep nothing personal", () => {
  it("removes names, quoted words, emails, IDs and numbers", () => {
    const text = scrubText(`Couldn't save "Ritvi's first smile" for Ritvi at mum@example.com, file 1AbCdEfGhIjKlMnOpQrStUvWx, phone 9876543210`);
    expect(text).not.toMatch(/Ritvi|smile|mum@|1AbCdEf|98765/);
  });
  it("keeps only the path, never query strings or IDs in links", () => {
    const report = scrubReport({ kind: "TypeError", message: "x", path: "https://app.example/book/edit/drive-1234567890abcdefghijklmn?memory=secret" });
    expect(report.path).toBe("/book/edit/[id]");
  });
});

describe("security rules", () => {
  it("only our own scripts may run, and no one may frame the app", () => {
    const csp = contentSecurityPolicy("abc");
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });
  it("spots sharing beyond named people", () => {
    expect(isPublicPermission({ id: "1", type: "anyone", role: "reader" })).toBe(true);
    expect(isPublicPermission({ id: "2", type: "domain", role: "reader" })).toBe(true);
    expect(isPublicPermission({ id: "3", type: "user", role: "writer", emailAddress: "a@b.c" })).toBe(false);
  });
});

describe("duplicate photos", () => {
  it("treats nearly identical fingerprints as the same photo", () => {
    expect(samePhoto("ffff0000ffff0000", "ffff0000ffff0001")).toBe(true);
    expect(samePhoto("ffff0000ffff0000", "0000ffff0000ffff")).toBe(false);
    expect(samePhoto(undefined, "ffff0000ffff0000")).toBe(false);
  });
});
