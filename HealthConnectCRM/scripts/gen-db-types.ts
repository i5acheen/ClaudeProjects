/**
 * Generates lib/db/types.ts in the same shape as `supabase gen types typescript`,
 * by introspecting a database that has the migrations applied.
 *   TEST_DATABASE_URL=postgres://... npx tsx scripts/gen-db-types.ts
 * Once the Supabase project exists, `supabase gen types typescript --linked` produces the same shape.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const root = path.resolve(__dirname, "..");
const PG_TO_TS: Record<string, string> = {
  uuid: "string", text: "string", int2: "number", int4: "number", int8: "number", float4: "number",
  float8: "number", numeric: "number", bool: "boolean", timestamptz: "string", timestamp: "string",
  date: "string", jsonb: "Json", json: "Json",
};

async function main() {
  const url = new URL(process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:54329/postgres");
  const admin = new Client({ connectionString: url.toString() });
  await admin.connect();
  await admin.query("drop database if exists hcrm_typegen with (force)");
  await admin.query("create database hcrm_typegen");
  await admin.end();
  url.pathname = "/hcrm_typegen";
  const db = new Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(root, "tests/rls/setup.sql"), "utf8"));
  for (const f of readdirSync(path.join(root, "supabase/migrations")).sort()) {
    await db.query(readFileSync(path.join(root, "supabase/migrations", f), "utf8"));
  }

  const enums = (await db.query(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
    from pg_type t join pg_enum e on e.enumtypid = t.oid join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' group by t.typname order by t.typname`)).rows as { name: string; labels: string[] }[];
  const enumNames = new Set(enums.map((e) => e.name));

  const cols = (await db.query(`
    select c.relname as table, c.relkind as kind, a.attname as column, t.typname as type,
           t.typcategory as category, et.typname as elem, not a.attnotnull as nullable,
           (a.atthasdef or a.attidentity <> '') as has_default
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid left join pg_type et on et.oid = t.typelem
    where n.nspname = 'public' and c.relkind in ('r','v') and a.attnum > 0 and not a.attisdropped
    order by c.relname, a.attnum`)).rows as {
    table: string; kind: string; column: string; type: string; category: string; elem: string | null; nullable: boolean; has_default: boolean;
  }[];

  const tsType = (type: string, category: string, elem: string | null): string => {
    if (category === "A" && elem) return `${tsType(elem, "", null)}[]`;
    if (enumNames.has(type)) return `Database["public"]["Enums"]["${type}"]`;
    return PG_TO_TS[type] ?? "unknown";
  };

  const byTable = new Map<string, typeof cols>();
  for (const c of cols) byTable.set(c.table, [...(byTable.get(c.table) ?? []), c]);

  const tables: string[] = [];
  const views: string[] = [];
  for (const [table, list] of byTable) {
    const row = list.map((c) => `          ${c.column}: ${tsType(c.type, c.category, c.elem)}${c.nullable || list[0].kind === "v" ? " | null" : ""}`).join("\n");
    if (list[0].kind === "v") {
      views.push(`      ${table}: {\n        Row: {\n${row}\n        }\n        Relationships: []\n      }`);
      continue;
    }
    const ins = list.map((c) => `          ${c.column}${c.nullable || c.has_default ? "?" : ""}: ${tsType(c.type, c.category, c.elem)}${c.nullable ? " | null" : ""}`).join("\n");
    const upd = list.map((c) => `          ${c.column}?: ${tsType(c.type, c.category, c.elem)}${c.nullable ? " | null" : ""}`).join("\n");
    tables.push(`      ${table}: {\n        Row: {\n${row}\n        }\n        Insert: {\n${ins}\n        }\n        Update: {\n${upd}\n        }\n        Relationships: []\n      }`);
  }

  const fns = (await db.query(`
    select p.proname as name, p.proargnames::text[] as argnames, array(select format_type(x, null) from unnest(p.proargtypes) x) as argtypes,
           p.pronargdefaults as ndefaults, format_type(p.prorettype, null) as rettype, p.proretset as retset
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prorettype <> 'trigger'::regtype
      and p.proname in ('move_lead_stage','log_audit','export_patient','anonymise_patient','auth_org_id','auth_role','auth_hospital_id','is_staff','is_admin')
    order by p.proname`)).rows as { name: string; argnames: string[] | null; argtypes: string[]; ndefaults: number; rettype: string }[];
  const fmt = (t: string): string => {
    const bare = t.replace(/^public\./, "");
    if (enumNames.has(bare)) return `Database["public"]["Enums"]["${bare}"]`;
    if (t.endsWith("[]")) return `${fmt(t.slice(0, -2))}[]`;
    if (t.startsWith("public.") || byTable.has(bare)) return `Database["public"]["Tables"]["${bare}"]["Row"]`;
    const map: Record<string, string> = { uuid: "string", text: "string", smallint: "number", integer: "number", boolean: "boolean", jsonb: "Json", "timestamp with time zone": "string", void: "undefined" };
    return map[t] ?? "unknown";
  };
  const functions = fns.map((f) => {
    const names = f.argnames ?? [];
    const firstDefault = f.argtypes.length - f.ndefaults;
    const args = f.argtypes.map((t, i) => `${names[i]}${i >= firstDefault ? "?" : ""}: ${fmt(t)}`).join("; ");
    return `      ${f.name}: {\n        Args: { ${args} }\n        Returns: ${fmt(f.rettype)}\n      }`;
  });

  const enumLines = enums.map((e) => `      ${e.name}: ${e.labels.map((l) => JSON.stringify(l)).join(" | ")}`);
  const out = `// Generated by scripts/gen-db-types.ts from supabase/migrations. Do not edit by hand.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
${tables.join("\n")}
    }
    Views: {
${views.join("\n")}
    }
    Functions: {
${functions.join("\n")}
    }
    Enums: {
${enumLines.join("\n")}
    }
    CompositeTypes: Record<string, never>
  }
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Enums<T extends keyof Database["public"]["Enums"]> = Database["public"]["Enums"][T];
`;
  writeFileSync(path.join(root, "lib/db/types.ts"), out);
  await db.end();
  const cleanup = new Client({ connectionString: process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:54329/postgres" });
  await cleanup.connect();
  await cleanup.query("drop database if exists hcrm_typegen with (force)");
  await cleanup.end();
  console.log(`wrote lib/db/types.ts: ${tables.length} tables, ${views.length} views, ${functions.length} functions, ${enums.length} enums`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
