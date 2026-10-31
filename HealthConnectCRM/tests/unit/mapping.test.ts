import { describe, expect, it } from "vitest";
import type { GraphLead } from "@/lib/meta/graph";
import { mapLead } from "@/lib/meta/mapping";

const lead = (fields: Record<string, string>, consent = true): GraphLead => ({
  id: "L1",
  created_time: "2026-10-30T10:00:00+0000",
  form_id: "F1",
  field_data: Object.entries(fields).map(([name, v]) => ({ name, values: [v] })),
  custom_disclaimer_responses: [{ checkbox_key: "wa", is_checked: consent ? "1" : "0" }],
});

describe("mapLead", () => {
  it("maps Meta standard fields and detects scheme + consent", () => {
    const m = mapLead(lead({ full_name: "Sunita Patil", phone_number: "+919876543210", city: "Paithan", "Do you have an Ayushman/MJPJAY card?": "होय, आयुष्मान", treatment: "Varicose veins" }));
    expect(m).toMatchObject({ fullName: "Sunita Patil", phoneE164: "+919876543210", district: "Paithan", scheme: "PM-JAY", treatment: "Varicose veins", consentWhatsapp: true });
  });
  it("uses admin-configured mappings for custom questions", () => {
    const m = mapLead(lead({ full_name: "A", phone_number: "9876543210", "तुमचा तालुका?": "Vaijapur" }), { "तुमचा तालुका?": "taluka" });
    expect(m.taluka).toBe("Vaijapur");
    expect(m.unmapped).toEqual({});
  });
  it("keeps unknown questions in unmapped and rejects bad phones", () => {
    const m = mapLead(lead({ phone_number: "12345", favourite_colour: "blue" }, false));
    expect(m.phoneE164).toBeNull();
    expect(m.unmapped).toEqual({ favourite_colour: "blue" });
    expect(m.consentWhatsapp).toBe(false);
  });
  it("no disclaimer means no consent", () => {
    const l = lead({ phone_number: "9876543210" });
    delete l.custom_disclaimer_responses;
    expect(mapLead(l).consentWhatsapp).toBe(false);
  });
});
