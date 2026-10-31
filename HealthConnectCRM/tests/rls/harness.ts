import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const ROOT = path.resolve(__dirname, "../..");

export function adminUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error("TEST_DATABASE_URL is required for RLS tests (a Postgres 15+ superuser URL).");
  }
  return url;
}

/** Creates a throwaway database with the Supabase shim + all migrations applied. */
export async function createTestDatabase(name: string): Promise<Client> {
  const base = new URL(adminUrl());
  const admin = new Client({ connectionString: base.toString() });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.query(`create database ${name}`);
  await admin.end();

  base.pathname = `/${name}`;
  const db = new Client({ connectionString: base.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(ROOT, "tests/rls/setup.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase/migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(path.join(dir, file), "utf8"));
  }
  return db;
}

export async function dropTestDatabase(db: Client, name: string): Promise<void> {
  await db.end();
  const admin = new Client({ connectionString: adminUrl() });
  await admin.connect();
  await admin.query(`drop database if exists ${name} with (force)`);
  await admin.end();
}

/**
 * Runs `fn` as an authenticated Supabase user (or service_role when userId is null)
 * inside a transaction that is always rolled back.
 */
export async function asUser<T>(
  db: Client,
  userId: string | null,
  fn: (q: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>,
): Promise<T> {
  await db.query("begin");
  try {
    if (userId) {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: userId })]);
    } else {
      await db.query("set local role service_role");
      await db.query("select set_config('request.jwt.claims', '', true)");
    }
    return await fn(async (sql, params) => (await db.query(sql, params as unknown[])).rows);
  } finally {
    await db.query("rollback");
  }
}
