import { defineConfig, devices } from "@playwright/test";

/**
 * E2E. `public.spec.ts` runs anywhere. `crm.spec.ts` needs a local Supabase stack
 * (`supabase start`, seeded) and runs when E2E_SUPABASE=1 — CI does this.
 */
const port = Number(process.env.PORT ?? 3100);
const fakeEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "e2e-anon-key-xxxxxxxxxxxxxxxx",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "e2e-service-role-key-xxxxxxxxxx",
  META_APP_ID: "e2e",
  META_APP_SECRET: "e2e-meta-app-secret-123",
  META_VERIFY_TOKEN: "e2e-meta-verify-token-123",
  META_PAGE_ID: "e2e-page",
  META_PAGE_ACCESS_TOKEN: "e2e-page-access-token-xxxxxxxx",
  META_GRAPH_VERSION: "v21.0",
  WA_PHONE_NUMBER_ID: "e2e-pn",
  WA_BUSINESS_ACCOUNT_ID: "e2e-waba",
  WA_ACCESS_TOKEN: "e2e-wa-access-token-xxxxxxxxx",
  WA_VERIFY_TOKEN: "e2e-wa-verify-token-123",
  AI_PROVIDER: "anthropic",
  ANTHROPIC_API_KEY: "e2e-not-used",
  APP_BASE_URL: `http://localhost:${port}`,
  INNGEST_DEV: "1",
};

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "retain-on-failure" },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH || undefined } },
      testMatch: /public\.spec/,
    },
  ],
  webServer: {
    command: `npx next start -p ${port}`,
    port,
    reuseExistingServer: !process.env.CI,
    env: { ...process.env, ...fakeEnv } as Record<string, string>,
    timeout: 120_000,
  },
});
