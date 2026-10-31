import { createClient } from "@supabase/supabase-js";
import type { Page } from "@playwright/test";

export const ORG = "00000000-0000-4000-8000-000000000001"; // supabase/seed.sql
export const HOSPITAL_VASCULAR = "00000000-0000-4000-8000-0000000000c1";
export const HOSPITAL_SPINE = "00000000-0000-4000-8000-0000000000c2";
const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

export function serviceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
}

/** Creates (or reuses) a user the way the Users screen does: org/role in app_metadata. */
export async function ensureUser(email: string, role: string, hospitalId?: string) {
  const db = serviceClient();
  const { data } = await db.auth.admin.listUsers();
  if (data.users.some((u) => u.email === email)) return;
  const { error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    app_metadata: { org_id: ORG, role, hospital_id: hospitalId ?? null, full_name: email.split("@")[0] },
  });
  if (error) throw error;
}

/** Real OTP login: request a code in the UI, read it from the local Mailpit inbox. */
export async function login(page: Page, email: string) {
  const since = Date.now();
  await page.goto("/login");
  await page.getByLabel(/work email/i).fill(email);
  await page.getByRole("button", { name: /send code/i }).click();
  await page.getByLabel(/6-digit code/i).waitFor();
  let code: string | null = null;
  for (let i = 0; i < 30 && !code; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const json = (await res.json()) as { messages: { ID: string; Created: string }[] };
    const latest = json.messages.find((m) => Date.parse(m.Created) >= since - 1000);
    if (latest) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${latest.ID}`)).json()) as { Text: string };
      code = /\b(\d{6})\b/.exec(msg.Text)?.[1] ?? null;
    }
    if (!code) await new Promise((r) => setTimeout(r, 500));
  }
  if (!code) throw new Error(`no OTP email for ${email}`);
  await page.getByLabel(/6-digit code/i).fill(code);
  await page.getByRole("button", { name: /verify/i }).click();
  await page.waitForURL(/\/(dashboard|portal)/);
}
