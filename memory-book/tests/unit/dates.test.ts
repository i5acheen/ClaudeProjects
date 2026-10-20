import { describe, expect, it } from "vitest";
import { ageStamp, monthOfAgeRange, monthPageTitle, monthsOld } from "@/lib/dates";

describe("age on a memory's page", () => {
  it("counts months and days", () => {
    expect(ageStamp("2026-05-07", "2026-10-20")).toBe("5 months, 13 days old");
    expect(ageStamp("2026-05-07", "2026-06-07")).toBe("1 month old");
    expect(ageStamp("2026-05-07", "2026-05-08")).toBe("1 day old");
  });
  it("knows the birthday itself and the days before", () => {
    expect(ageStamp("2026-05-07", "2026-05-07")).toBe("The day you were born");
    expect(ageStamp("2026-05-07", "2026-04-20")).toBe("2 weeks before you arrived");
    expect(ageStamp("2026-05-07", "2027-05-07")).toBe("Your 1st birthday");
  });
  it("handles month ends (born on the 31st)", () => {
    expect(monthsOld("2026-01-31", "2026-02-28")).toBe(1); // 28 Feb is the end of the first month
    expect(monthsOld("2026-01-31", "2026-03-31")).toBe(2);
  });
});

describe("month pages", () => {
  it("names and dates each month of age", () => {
    expect(monthPageTitle(0)).toBe("The first month");
    expect(monthPageTitle(1)).toBe("1 month");
    expect(monthPageTitle(5)).toBe("5 months");
    expect(monthOfAgeRange("2026-05-07", 0)).toEqual({ from: "2026-05-07", to: "2026-06-06" });
  });
});
