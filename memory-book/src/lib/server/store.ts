import "server-only";
import { createHmac } from "node:crypto";

/**
 * The only thing Memory Book keeps on its own side: a tiny record per account.
 *
 *   - no email address, name, child details, memories or photos — ever;
 *   - the account is known only by a one-way code made from the email
 *     (it can't be turned back into the email);
 *   - it holds when you agreed to the privacy notice (and which version),
 *     and later your plan and payment references.
 *
 * Stored in Upstash Redis (add it from Vercel → Storage). Until it's set up,
 * the app works normally and the consent record is kept in your own Drive.
 */

export interface AccountRecord {
  consentVersion?: string;
  consentAt?: string;
  guardianConfirmed?: boolean;
  plan?: "free" | "premium";
  createdAt?: string;
}

const url = () => process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = () => process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

export const storeConfigured = () => !!url() && !!token();

/** One-way account code: the same email always gives the same code, but the code can't be turned back. */
export function accountId(email: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(`account:${email.trim().toLowerCase()}`).digest("hex").slice(0, 40);
}

const key = (id: string) => `account:${id}`;

async function command<T = unknown>(...args: (string | number)[]): Promise<T | null> {
  if (!storeConfigured()) return null;
  const response = await fetch(url()!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Account store unavailable (${response.status})`);
  return ((await response.json()) as { result: T }).result;
}

export async function getAccount(id: string): Promise<AccountRecord | null> {
  const raw = await command<string | null>("GET", key(id));
  return raw ? (JSON.parse(raw) as AccountRecord) : null;
}

export async function updateAccount(id: string, change: Partial<AccountRecord>): Promise<AccountRecord | null> {
  if (!storeConfigured()) return null;
  const current = (await getAccount(id)) ?? { createdAt: new Date().toISOString() };
  const next = { ...current, ...change };
  await command("SET", key(id), JSON.stringify(next));
  return next;
}

/** "Delete my account": removes everything kept here about this account. */
export async function deleteAccount(id: string): Promise<void> {
  await command("DEL", key(id));
}
