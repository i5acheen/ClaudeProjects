import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined, set: () => undefined, delete: () => undefined }) }));
const { decodeOps, encodeOps } = await import("@/lib/demo/journal");

describe("prototype change log", () => {
  it("round-trips ops through the compressed cookie encoding", () => {
    const ops = [
      { k: "w" as const, t: "calls", m: "insert" as const, rows: [{ id: "x", notes: "नमस्कार जी" }], c: [], now: "2026-11-03T10:00:00Z" },
      {
        k: "r" as const,
        n: "move_lead_stage",
        args: { p_lead_id: "L1", p_to_stage: 1 },
        a: { role: "coordinator" as const, userId: "u", hospitalId: null },
        now: "2026-11-03T10:00:01Z",
      },
    ];
    const { raw } = encodeOps(ops);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/); // cookie-safe
    expect(decodeOps(raw)).toEqual(ops);
  });

  it("drops the oldest changes when the log outgrows the cookie budget", () => {
    const big = Array.from({ length: 400 }, (_, i) => ({
      k: "w" as const,
      t: "notes",
      m: "insert" as const,
      rows: [{ id: crypto.randomUUID(), body: crypto.randomUUID() + i }],
      now: `t${i}`,
    }));
    const { raw, ops } = encodeOps(big);
    expect(raw.length).toBeLessThanOrEqual(3600 * 4);
    expect(ops.length).toBeLessThan(big.length);
    expect(ops.at(-1)).toEqual(big.at(-1)); // newest kept
  });

  it("ignores a tampered log instead of failing", () => {
    expect(decodeOps("not-a-valid-log")).toEqual([]);
  });
});
