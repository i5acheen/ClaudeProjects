import { expect, test } from "@playwright/test";

test("signed-out users land on the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: /sign in|साइन इन/i })).toBeVisible();
  await expect(page.getByLabel(/work email|कामाचा ईमेल/i)).toBeVisible();
});

test("protected routes redirect to login", async ({ page }) => {
  for (const path of ["/dashboard", "/pipeline", "/inbox", "/settings", "/portal", "/privacy"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login/);
  }
});

test("login page is served in Marathi for Marathi browsers", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "mr-IN", extraHTTPHeaders: { "accept-language": "mr-IN,mr;q=0.9" } });
  const page = await ctx.newPage();
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "साइन इन" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "mr");
  await ctx.close();
});

test("privacy policy and terms are public (required by Meta)", async ({ page }) => {
  await page.goto("/privacy-policy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();
  await expect(page.getByText(/Grievance officer/i)).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByText(/call 108/i)).toBeVisible();
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/login");
  const h = res.headers();
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["strict-transport-security"]).toContain("max-age=");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("health check reports ok with a valid environment", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ status: "ok", env: "ok" });
});

test("webhook verification handshake", async ({ request }) => {
  const ok = await request.get(
    `/api/webhooks/meta?hub.mode=subscribe&hub.verify_token=${process.env.E2E_META_VERIFY_TOKEN ?? "e2e-meta-verify-token-123"}&hub.challenge=4242`,
  );
  expect(await ok.text()).toBe("4242");
  const bad = await request.get("/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=1");
  expect(bad.status()).toBe(403);
});

test("unsigned webhook POSTs are rejected", async ({ request }) => {
  const res = await request.post("/api/webhooks/meta", { data: { object: "page", entry: [] } });
  expect(res.status()).toBe(401);
});

test("login page has no horizontal scroll on phones", async ({ page }) => {
  await page.goto("/login");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
