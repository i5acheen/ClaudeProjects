import { describe, expect, it } from "vitest";
import { checkEnv, coreEnv, metaEnv, NotConfiguredError, waEnv } from "@/lib/env";

const core = {
  NEXT_PUBLIC_SUPABASE_URL: "https://api.crm.example.in",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-xxxxxxxxxxxxxxxxxxxx",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-key-xxxxxxxxxxxx",
  APP_BASE_URL: "https://crm.example.in",
};

describe("environment groups", () => {
  it("the CRM runs with only core settings: Meta and WhatsApp report 'not configured'", () => {
    expect(coreEnv(core).AI_PROVIDER).toBe("none");
    const r = checkEnv(core);
    expect(r.core).toEqual([]);
    expect(r.meta).toContain("META_APP_SECRET");
    expect(r.whatsapp).toContain("WA_ACCESS_TOKEN");
    expect(() => metaEnv(core)).toThrow(NotConfiguredError);
    expect(() => waEnv(core)).toThrow(/whatsapp is not configured/);
  });

  it("missing core settings are reported by name only", () => {
    const r = checkEnv({ APP_BASE_URL: "https://crm.example.in" });
    expect(r.core).toEqual(expect.arrayContaining(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]));
    expect(() => coreEnv({ ...core, SUPABASE_SERVICE_ROLE_KEY: "short" })).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
    expect(() => coreEnv({ ...core, SUPABASE_SERVICE_ROLE_KEY: "short" })).not.toThrow(/short/);
  });

  it("choosing an AI provider requires its key", () => {
    expect(checkEnv({ ...core, AI_PROVIDER: "anthropic" }).core).toEqual(["ANTHROPIC_API_KEY"]);
  });

  it("WhatsApp is configured independently of Meta Lead Ads", () => {
    const wa = {
      META_APP_SECRET: "app-secret-0123456789",
      META_GRAPH_VERSION: "v21.0",
      WA_PHONE_NUMBER_ID: "1",
      WA_BUSINESS_ACCOUNT_ID: "2",
      WA_ACCESS_TOKEN: "wa-token-xxxxxxxxxxxxxxxxx",
      WA_VERIFY_TOKEN: "verify-token-0123456789",
    };
    const r = checkEnv({ ...core, ...wa });
    expect(r.whatsapp).toEqual([]);
    expect(r.meta).not.toEqual([]);
  });
});
