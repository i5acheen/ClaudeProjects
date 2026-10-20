import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-unit-tests-only";
});

describe("account store", () => {
  it("knows an account only by a one-way code, never the email", async () => {
    const { accountId } = await import("@/lib/server/store");
    const id = accountId("Mum@Example.com");
    expect(id).toBe(accountId("mum@example.com "));
    expect(id).toMatch(/^[0-9a-f]{40}$/);
    expect(id).not.toContain("mum");
  });
});
