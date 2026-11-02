import { expect, test, type Page } from "@playwright/test";

/** Prototype (DEMO_MODE) walkthrough: every role, every screen, the main actions. Run with E2E_DEMO=1. */
test.skip(!process.env.E2E_DEMO, "demo build only — set E2E_DEMO=1");
test.describe.configure({ mode: "serial" });

async function enter(page: Page, role: string) {
  await page.goto("/login");
  await page.getByTestId(`demo-${role}`).click();
  await page.waitForURL(/\/(dashboard|portal)/);
}

test("demo login offers the four roles and health reports demo mode", async ({ page, request }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  for (const r of ["admin", "coordinator", "hospital_partner", "viewer"]) await expect(page.getByTestId(`demo-${r}`)).toBeVisible();
  expect(await (await request.get("/api/health")).json()).toMatchObject({ status: "ok", mode: expect.stringContaining("demo") });
});

test("coordinator: every screen renders with sample data", async ({ page }) => {
  await enter(page, "coordinator");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Prototype")).toBeVisible();
  await expect(page.getByTestId("kpi-Eligible")).not.toHaveText("");
  const checks: [string, (p: Page) => ReturnType<Page["getByRole"]>][] = [
    ["/pipeline", (p) => p.getByRole("heading", { name: /Docs pending/ })],
    ["/inbox?f=human", (p) => p.getByRole("link", { name: "Needs human", exact: true })],
    ["/tasks", (p) => p.getByRole("heading", { name: /Due today/ })],
    ["/hospitals", (p) => p.getByRole("cell", { name: "SAMPLE Vascular Hospital" })],
    ["/alerts", (p) => p.getByRole("heading", { name: "Alerts" })],
  ];
  for (const [path, marker] of checks) {
    await page.goto(path);
    await expect(marker(page)).toBeVisible();
  }
  expect(await page.getByTestId("lead-card").count()).toBe(0); // alerts page
  await page.goto("/pipeline");
  expect(await page.getByTestId("lead-card").count()).toBeGreaterThan(30);
});

test("coordinator: open a lead, move stage, add note, reply on WhatsApp", async ({ page }) => {
  await enter(page, "coordinator");
  await page.goto("/pipeline");
  await page.getByTestId("column-new").getByTestId("lead-card").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/leads\//);
  await page.getByLabel("Move to").first().selectOption({ label: "Contacted" });
  await page.getByRole("button", { name: "Move to" }).click();
  await expect(page.getByText(/New → Contacted/)).toBeVisible();
  await page.getByLabel("Add note").fill("Demo note from the walkthrough");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Demo note from the walkthrough")).toBeVisible();
  await page.getByRole("link", { name: "Inbox" }).last().click();
  await expect(page).toHaveURL(/\/inbox\?c=/);
  const composer = page.getByLabel("Type a reply…");
  if (await composer.isVisible()) {
    await composer.fill("नमस्कार जी, मी समन्वयक बोलत आहे.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("नमस्कार जी, मी समन्वयक बोलत आहे.").last()).toBeVisible();
  } else {
    await expect(page.getByText(/24-hour window closed/)).toBeVisible();
  }
});

test("hospital partner: portal shows only referred patients of their hospital and can mark admission", async ({ page }) => {
  await enter(page, "hospital_partner");
  await expect(page).toHaveURL(/\/portal/);
  const cards = page.getByTestId("portal-lead");
  const n = await cards.count();
  expect(n).toBeGreaterThan(0);
  for (let i = 0; i < n; i++) await expect(cards.nth(i)).toContainText(/varicose veins/);
  const pending = cards.filter({ has: page.getByRole("button", { name: "Mark admitted" }) }).first();
  await pending.getByRole("button", { name: "Mark admitted" }).click();
  await expect(page.getByText(/Admitted/).first()).toBeVisible();
  await page.goto("/pipeline");
  await expect(page).toHaveURL(/\/portal/);
});

test("viewer: dashboard only, no patient data", async ({ page }) => {
  await enter(page, "viewer");
  await expect(page.getByText("Lead → admission")).toBeVisible();
  await expect(page.getByText(/SAMPLE —/)).toHaveCount(0);
  await page.goto("/inbox");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("admin: settings, users, privacy export", async ({ page }) => {
  await enter(page, "admin");
  await page.goto("/settings");
  await expect(page.getByText(/rules only/)).toBeVisible();
  await page.goto("/settings/users");
  await expect(page.getByText("Priya Jadhav")).toBeVisible();
  await page.goto("/privacy?phone=9000010001");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data (JSON)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^patient-.*\.json$/);
});
