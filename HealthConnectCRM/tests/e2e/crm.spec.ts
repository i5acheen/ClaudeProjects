import { expect, test } from "@playwright/test";
import { HOSPITAL_SPINE, HOSPITAL_VASCULAR, ensureUser, login, serviceClient } from "./helpers";

test.skip(!process.env.E2E_SUPABASE, "needs a local Supabase stack (supabase start) — set E2E_SUPABASE=1");
test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  await ensureUser("coordinator@e2e.test", "coordinator");
  await ensureUser("admin@e2e.test", "admin");
  await ensureUser("partner-vascular@e2e.test", "hospital_partner", HOSPITAL_VASCULAR);
  await ensureUser("partner-spine@e2e.test", "hospital_partner", HOSPITAL_SPINE);
  await ensureUser("viewer@e2e.test", "viewer");
});

test("coordinator creates a lead manually, moves stage, adds a note and assigns a hospital", async ({ page }) => {
  await login(page, "coordinator@e2e.test");
  await page.goto("/pipeline");
  await page.getByRole("button", { name: "New lead" }).click();
  await page.getByLabel("Patient name").fill("E2E — Test Patient");
  await page.getByLabel("Phone").fill("9000000999");
  await page.getByLabel("Treatment").fill("thyroid");
  await page.getByRole("button", { name: "Create lead" }).click();
  await page.waitForURL(/\/leads\//);
  await expect(page.getByRole("heading", { name: "E2E — Test Patient" })).toBeVisible();

  // move stage New → Contacted
  await page.getByLabel("Move to").first().selectOption({ label: "Contacted" });
  await page.getByRole("button", { name: "Move to" }).click();
  await expect(page.getByText(/New → Contacted/)).toBeVisible();

  // add note
  await page.getByLabel("Add note").fill("Called patient, will send documents");
  await page.getByRole("button", { name: "Add note" }).click();
  await expect(page.getByText("Called patient, will send documents")).toBeVisible();

  // assign hospital
  await page.getByLabel("Hospital", { exact: true }).selectOption({ label: "SAMPLE Thyroid Clinic" });
  await page.getByRole("button", { name: "Assign hospital" }).click();
  await page.reload();
  await expect(page.getByLabel("Hospital", { exact: true })).toHaveValue(/.+/);

  // the stage change is in the database with actor + reason
  const leadId = page.url().split("/leads/")[1];
  const { data: events } = await serviceClient().from("stage_events").select("to_stage, actor_type").eq("lead_id", leadId);
  expect(events).toContainEqual({ to_stage: 1, actor_type: "user" });
});

test("pipeline board moves a card with the keyboard-friendly select", async ({ page }) => {
  await login(page, "coordinator@e2e.test");
  await page.goto("/pipeline");
  const card = page.getByTestId("lead-card").filter({ hasText: "SAMPLE — Sunita P." });
  await card.getByRole("combobox").selectOption({ label: "Contacted" });
  await expect(page.getByTestId("column-contacted").getByText("SAMPLE — Sunita P.")).toBeVisible();
});

test("hospital partner sees only their referred patients and can mark admission", async ({ page }) => {
  await login(page, "partner-vascular@e2e.test");
  await expect(page).toHaveURL(/\/portal/);
  const cards = page.getByTestId("portal-lead");
  await expect(cards.filter({ hasText: "SAMPLE — Vithal D." })).toBeVisible(); // stage 4 at vascular
  await expect(page.getByText("SAMPLE — Ramesh K.")).toHaveCount(0); // stage 2, not referred
  await expect(page.getByText("SAMPLE — Fatima S.")).toHaveCount(0); // eligible, no hospital
  await cards.filter({ hasText: "SAMPLE — Vithal D." }).getByRole("button", { name: "Mark admitted" }).click();
  await expect(cards.filter({ hasText: "SAMPLE — Vithal D." }).getByText(/Admitted/)).toBeVisible();

  // partner cannot open coordinator screens
  await page.goto("/pipeline");
  await expect(page).toHaveURL(/\/portal/);
});

test("another hospital's partner sees none of them", async ({ page }) => {
  await login(page, "partner-spine@e2e.test");
  await expect(page.getByText("SAMPLE — Vithal D.")).toHaveCount(0);
  await expect(page.getByText("No referred patients.")).toBeVisible();
});

test("dashboard numbers match database counts", async ({ page }) => {
  await login(page, "admin@e2e.test");
  await page.goto("/dashboard");
  const db = serviceClient();
  const { count: eligible } = await db.from("leads").select("id", { count: "exact", head: true }).eq("stage", 3);
  const { count: referred } = await db.from("leads").select("id", { count: "exact", head: true }).eq("stage", 4);
  await expect(page.getByTestId("kpi-Eligible")).toHaveText(String(eligible));
  await expect(page.getByTestId("kpi-Referred")).toHaveText(String(referred));
  await expect(page.getByRole("cell", { name: "AD100" })).toBeVisible(); // campaign table shows ads
});

test("admin can switch the bot off globally (audited)", async ({ page }) => {
  await login(page, "admin@e2e.test");
  await page.goto("/settings");
  await page.getByTestId("bot-global-toggle").uncheck();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved")).toBeVisible();
  const db = serviceClient();
  const { data: org } = await db.from("orgs").select("settings").single();
  expect((org?.settings as { bot: { enabled: boolean } }).bot.enabled).toBe(false);
  const { data: audit } = await db.from("audit_log").select("action").eq("action", "bot.global_disable");
  expect(audit?.length).toBeGreaterThan(0);
  await page.getByTestId("bot-global-toggle").check();
  await page.getByRole("button", { name: "Save" }).click();
});

test("privacy export and deletion work and are audited", async ({ page }) => {
  await login(page, "admin@e2e.test");
  await page.goto("/privacy?phone=9000000006");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export data (JSON)" }).click();
  expect((await download).suggestedFilename()).toMatch(/^patient-.*\.json$/);
  await page.getByLabel("Reason").fill("patient request (e2e)");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete / anonymise" }).click();
  await expect(page.getByText("Anonymised (audited).")).toBeVisible();
  const { data: audit } = await serviceClient().from("audit_log").select("action").in("action", ["patient.exported", "patient.anonymised"]);
  expect(new Set(audit?.map((a) => a.action))).toEqual(new Set(["patient.exported", "patient.anonymised"]));
});

test("viewer sees the dashboard but no patient data", async ({ page }) => {
  await login(page, "viewer@e2e.test");
  await page.goto("/pipeline");
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText(/SAMPLE —/)).toHaveCount(0);
});
