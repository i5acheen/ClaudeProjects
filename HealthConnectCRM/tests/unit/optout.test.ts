import { describe, expect, it } from "vitest";
import { isOptIn, isOptOut } from "@/lib/whatsapp/optout";

describe("opt-out detection", () => {
  it.each(["STOP", "stop", " Stop. ", "थांबवा", "बंद करा", "बंद करो", "बंद"])("opts out on %s", (t) => expect(isOptOut(t)).toBe(true));
  it.each(["please don't stop helping", "माझं ऑपरेशन बंद झालं का?", "stopped working", ""])("does not opt out on %s", (t) =>
    expect(isOptOut(t)).toBe(false),
  );
  it("opts back in on START", () => expect(isOptIn("START")).toBe(true));
});
