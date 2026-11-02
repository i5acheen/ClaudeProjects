import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { buildDemoData, DEMO_ORG, type Row, type Tables } from "./data";

/**
 * In-memory stand-in for the Supabase client used by DEMO_MODE (prototype on Vercel without a database).
 * Supports exactly the query shapes the app uses: select with embedded relations (incl. !inner and filters
 * on embedded columns), eq/neq/is/in/gt/gte/lt/lte/ilike/not, order, limit, single/maybeSingle, head counts,
 * insert/update/upsert/delete, the reporting views and the RPC functions. Access per role mirrors the
 * database's RLS in simplified form; the real policies are covered by tests/rls.
 * State lives in server memory: it resets on redeploys and differs between serverless instances.
 */
type Result = { data: unknown; error: { message: string; code?: string } | null; count?: number | null };
type Actor = {
  userId: string | null;
  role: "admin" | "coordinator" | "hospital_partner" | "viewer" | "service";
  hospitalId: string | null;
};

const globalState = globalThis as unknown as { __hcDemo?: Tables };
function db(): Tables {
  if (!globalState.__hcDemo) globalState.__hcDemo = buildDemoData();
  return globalState.__hcDemo;
}

// ---------------------------------------------------------------------------
// Relations used by embedded selects
// ---------------------------------------------------------------------------
type Rel = { kind: "one"; table: string; fk: string } | { kind: "many"; table: string; fk: string };
const RELS: Record<string, Record<string, Rel>> = {
  leads: {
    patients: { kind: "one", table: "patients", fk: "patient_id" },
    campaigns: { kind: "one", table: "campaigns", fk: "campaign_id" },
    hospitals: { kind: "one", table: "hospitals", fk: "hospital_id" },
  },
  tasks: { leads: { kind: "one", table: "leads", fk: "lead_id" } },
  calls: { leads: { kind: "one", table: "leads", fk: "lead_id" } },
  conversations: { patients: { kind: "one", table: "patients", fk: "patient_id" } },
  patients: { leads: { kind: "many", table: "leads", fk: "patient_id" } },
};
const PK: Record<string, string[]> = { profiles: ["user_id"], lead_facts: ["lead_id", "key"] };

type SelectNode = { star: boolean; cols: string[]; embeds: { name: string; inner: boolean; node: SelectNode }[] };
function parseSelect(src: string): SelectNode {
  const node: SelectNode = { star: false, cols: [], embeds: [] };
  let depth = 0;
  let cur = "";
  const parts: string[] = [];
  for (const ch of src) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  for (const p of parts) {
    const m = /^([a-z_]+)(!inner)?\(([\s\S]*)\)$/.exec(p);
    if (m) node.embeds.push({ name: m[1], inner: !!m[2], node: parseSelect(m[3]) });
    else if (p === "*") node.star = true;
    else node.cols.push(p);
  }
  return node;
}

// ---------------------------------------------------------------------------
// Row-level visibility (simplified RLS)
// ---------------------------------------------------------------------------
const PERSONAL = new Set([
  "patients",
  "leads",
  "lead_facts",
  "conversations",
  "messages",
  "documents",
  "stage_events",
  "tasks",
  "notes",
  "consents",
  "bot_runs",
  "calls",
]);
function visibleRows(table: string, a: Actor): Row[] {
  const rows = db()[table] ?? [];
  if (a.role === "service") return rows;
  if (table === "notifications") return rows.filter((r) => r.user_id === a.userId);
  if (table === "audit_log") return a.role === "admin" ? rows : [];
  if (table === "webhook_events") return [];
  if (table === "profiles" && (a.role === "hospital_partner" || a.role === "viewer")) return rows.filter((r) => r.user_id === a.userId);
  if (a.role === "admin" || a.role === "coordinator") return rows;
  if (a.role === "hospital_partner") {
    const leads = db().leads.filter((l) => l.hospital_id === a.hospitalId && Number(l.stage) >= 4);
    if (table === "leads") return leads;
    if (table === "patients") return rows.filter((p) => leads.some((l) => l.patient_id === p.id));
    if (PERSONAL.has(table)) return [];
  }
  if (a.role === "viewer" && PERSONAL.has(table)) return [];
  return rows;
}

function expand(row: Row, node: SelectNode, table: string, a: Actor): { full: Row; ok: boolean } {
  const full: Row = { ...row };
  let ok = true;
  for (const e of node.embeds) {
    const rel = RELS[table]?.[e.name];
    if (!rel) continue;
    const pool = visibleRows(rel.table, a);
    if (rel.kind === "one") {
      const target = pool.find((r) => r.id === row[rel.fk]);
      if (!target) {
        full[e.name] = null;
        if (e.inner) ok = false;
        continue;
      }
      const sub = expand(target, e.node, rel.table, a);
      full[e.name] = sub.full;
      if (!sub.ok && e.inner) ok = false;
    } else {
      full[e.name] = pool.filter((r) => r[rel.fk] === row.id).map((r) => expand(r, e.node, rel.table, a).full);
    }
  }
  return { full, ok };
}

function project(full: Row, node: SelectNode): Row {
  const out: Row = node.star ? Object.fromEntries(Object.entries(full).filter(([k]) => !node.embeds.some((e) => e.name === k))) : {};
  for (const c of node.cols) out[c] = full[c] ?? null;
  for (const e of node.embeds) {
    const v = full[e.name];
    out[e.name] = Array.isArray(v) ? v.map((x) => project(x as Row, e.node)) : v ? project(v as Row, e.node) : null;
  }
  return out;
}

function getPath(row: Row, path: string): unknown {
  return path.split(".").reduce<unknown>((v, k) => (v && typeof v === "object" ? (v as Row)[k] : undefined), row);
}

type Filter = (row: Row) => boolean;
const cmp = (a: unknown, b: unknown) => (String(a ?? "") < String(b ?? "") ? -1 : String(a ?? "") > String(b ?? "") ? 1 : 0);
const num = (v: unknown) => (typeof v === "number" ? v : Number.isNaN(Number(v)) ? v : Number(v));
const like = (pattern: string) =>
  new RegExp(
    `^${pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/%/g, ".*")
      .replace(/_/g, ".")}$`,
    "i",
  );

// ---------------------------------------------------------------------------
// Reporting views (computed from all rows of the org, like the SQL views)
// ---------------------------------------------------------------------------
function reached(l: Row): number {
  const ev = db()
    .stage_events.filter((e) => e.lead_id === l.id && Number(e.to_stage) >= 0)
    .map((e) => Number(e.to_stage));
  return Math.max(Number(l.stage) >= 0 ? Number(l.stage) : 0, ...ev, 0);
}
function istDay(isoStr: unknown, unit: "day" | "month"): string {
  const d = new Date(new Date(String(isoStr)).getTime() + 5.5 * 3600_000);
  return unit === "day" ? d.toISOString().slice(0, 10) : `${d.toISOString().slice(0, 7)}-01`;
}
function view(name: string, a: Actor): Row[] {
  if (!["admin", "coordinator", "viewer"].includes(a.role)) return [];
  const leads = db().leads;
  if (name === "v_funnel") {
    const groups = new Map<string, Row>();
    for (const l of leads) {
      const key = [istDay(l.created_at, "day"), l.source, l.campaign_id, l.treatment].join("|");
      const g = groups.get(key) ?? {
        day: istDay(l.created_at, "day"),
        source: l.source,
        campaign_id: l.campaign_id,
        treatment: l.treatment,
        leads: 0,
        contacted: 0,
        docs_pending: 0,
        eligible: 0,
        referred: 0,
        admitted: 0,
        lost: 0,
      };
      const r = reached(l);
      g.leads = Number(g.leads) + 1;
      (["contacted", "docs_pending", "eligible", "referred", "admitted"] as const).forEach(
        (k, i) => (g[k] = Number(g[k]) + (r >= i + 1 ? 1 : 0)),
      );
      g.lost = Number(g.lost) + (l.stage === -1 ? 1 : 0);
      groups.set(key, g);
    }
    return [...groups.values()];
  }
  if (name === "v_campaign_performance") {
    return db().campaigns.map((c) => {
      const ls = leads.filter((l) => l.campaign_id === c.id);
      const adm = ls.filter((l) => reached(l) >= 5).length;
      return {
        campaign_id: c.id,
        name: c.name,
        meta_campaign_id: c.meta_campaign_id,
        meta_adset_id: c.meta_adset_id,
        meta_ad_id: c.meta_ad_id,
        treatment: c.treatment,
        leads: ls.length,
        contacted: ls.filter((l) => reached(l) >= 1).length,
        eligible: ls.filter((l) => reached(l) >= 3).length,
        admitted: adm,
        admission_rate_pct: ls.length ? Math.round((1000 * adm) / ls.length) / 10 : 0,
      };
    });
  }
  if (name === "v_coordinator_stats") {
    const by = new Map<string, Row>();
    for (const l of leads) {
      if (!l.assigned_to) continue;
      const g = by.get(String(l.assigned_to)) ?? { user_id: l.assigned_to, leads: 0, contacted: 0, referred: 0, admitted: 0 };
      const r = reached(l);
      g.leads = Number(g.leads) + 1;
      g.contacted = Number(g.contacted) + (r >= 1 ? 1 : 0);
      g.referred = Number(g.referred) + (r >= 4 ? 1 : 0);
      g.admitted = Number(g.admitted) + (r >= 5 ? 1 : 0);
      by.set(String(l.assigned_to), g);
    }
    return [...by.values()];
  }
  if (name === "v_response_times") {
    const days = new Map<string, number[]>();
    for (const m of db().messages.filter((x) => x.direction === "in")) {
      const reply = db().messages.find(
        (o) =>
          o.conversation_id === m.conversation_id &&
          o.direction === "out" &&
          !o.is_internal_note &&
          ["bot", "coordinator"].includes(String(o.sender)) &&
          String(o.created_at) >= String(m.created_at),
      );
      if (!reply) continue;
      const k = istDay(m.created_at, "day");
      days.set(k, [...(days.get(k) ?? []), (Date.parse(String(reply.created_at)) - Date.parse(String(m.created_at))) / 60_000]);
    }
    return [...days.entries()].map(([day, xs]) => {
      const s = [...xs].sort((p, q) => p - q);
      return {
        day,
        replied_by: "coordinator",
        replies: xs.length,
        avg_minutes: Math.round((10 * xs.reduce((p, q) => p + q, 0)) / xs.length) / 10,
        median_minutes: Math.round(10 * s[Math.floor(s.length / 2)]) / 10,
      };
    });
  }
  if (name === "v_template_counts") {
    const by = new Map<string, Row>();
    for (const m of db().messages.filter((x) => x.type === "template")) {
      const cat = String(db().wa_templates.find((t) => t.name === m.template_name)?.category ?? "unknown");
      const key = `${istDay(m.created_at, "month")}|${cat}`;
      const g = by.get(key) ?? { month: istDay(m.created_at, "month"), category: cat, sent: 0, delivered: 0 };
      g.sent = Number(g.sent) + 1;
      g.delivered = Number(g.delivered) + (["delivered", "read"].includes(String(m.status)) ? 1 : 0);
      by.set(key, g);
    }
    return [...by.values()];
  }
  return [];
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------
class Query implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private orders: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private mode: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private node: SelectNode = parseSelect("*");
  private returning = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private conflict: string[] = [];
  private head = false;
  private counting = false;
  private one: "single" | "maybe" | null = null;

  constructor(
    private table: string,
    private actor: Actor,
  ) {}

  select(cols = "*", opts?: { count?: string; head?: boolean }) {
    this.node = parseSelect(cols);
    if (this.mode !== "select") this.returning = true;
    this.head = !!opts?.head;
    this.counting = !!opts?.count;
    return this;
  }
  insert(v: Row | Row[]) {
    this.mode = "insert";
    this.payload = Array.isArray(v) ? v : [v];
    return this;
  }
  upsert(v: Row | Row[], opts?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    this.mode = "upsert";
    this.payload = Array.isArray(v) ? v : [v];
    this.conflict = opts?.onConflict ? opts.onConflict.split(",").map((s) => s.trim()) : (PK[this.table] ?? ["id"]);
    return this;
  }
  update(v: Row) {
    this.mode = "update";
    this.patch = v;
    return this;
  }
  delete(opts?: { count?: string }) {
    this.mode = "delete";
    this.counting = !!opts?.count;
    return this;
  }
  eq(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) === v || (typeof v === "number" && Number(getPath(r, c)) === v));
    return this;
  }
  neq(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) !== v);
    return this;
  }
  is(c: string, v: null | boolean) {
    this.filters.push((r) => (v === null ? getPath(r, c) == null : getPath(r, c) === v));
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.filters.push((r) => vs.includes(getPath(r, c)));
    return this;
  }
  gt(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) != null && (num(getPath(r, c)) as number) > (num(v) as number));
    return this;
  }
  gte(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) != null && cmp(getPath(r, c), v) >= 0);
    return this;
  }
  lt(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) != null && cmp(getPath(r, c), v) < 0);
    return this;
  }
  lte(c: string, v: unknown) {
    this.filters.push((r) => getPath(r, c) != null && cmp(getPath(r, c), v) <= 0);
    return this;
  }
  ilike(c: string, pattern: string) {
    this.filters.push((r) => like(pattern).test(String(getPath(r, c) ?? "")));
    return this;
  }
  not(c: string, op: string, v: unknown) {
    this.filters.push((r) => (op === "is" ? (v === null ? getPath(r, c) != null : getPath(r, c) !== v) : getPath(r, c) !== v));
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orders.push({ col, asc: opts?.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }

  then<A = Result, B = never>(
    ok?: ((v: Result) => A | PromiseLike<A>) | null,
    err?: ((e: unknown) => B | PromiseLike<B>) | null,
  ): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, err);
  }

  private matching(): Row[] {
    const base = this.table.startsWith("v_") ? view(this.table, this.actor) : visibleRows(this.table, this.actor);
    return base.filter((row) => {
      const { full, ok } = expand(row, this.node, this.table, this.actor);
      return ok && this.filters.every((f) => f(full));
    });
  }

  private finish(rows: Row[], count?: number): Result {
    const out = rows.map((r) => project(expand(r, this.node, this.table, this.actor).full, this.node));
    if (this.head) return { data: null, error: null, count: count ?? rows.length };
    if (this.one) {
      if (out.length === 0)
        return this.one === "maybe" ? { data: null, error: null } : { data: null, error: { message: "no rows", code: "PGRST116" } };
      return { data: out[0], error: null, count };
    }
    return { data: out, error: null, count: this.counting ? (count ?? rows.length) : null };
  }

  private run(): Result {
    const store = db();
    store[this.table] ??= [];
    const now = new Date().toISOString();
    if (this.mode === "select") {
      let rows = this.matching();
      for (const o of [...this.orders].reverse()) rows = [...rows].sort((p, q) => (o.asc ? 1 : -1) * cmp(p[o.col], q[o.col]));
      const total = rows.length;
      if (this.lim != null) rows = rows.slice(0, this.lim);
      return this.finish(rows, total);
    }
    if (this.mode === "insert" || this.mode === "upsert") {
      if (this.table === "audit_log" || this.table === "stage_events" || this.table === "webhook_events") {
        if (this.actor.role !== "service") return { data: null, error: { message: "permission denied (demo)", code: "42501" } };
      }
      const written: Row[] = [];
      for (const v of this.payload) {
        const existing = this.mode === "upsert" ? store[this.table].find((r) => this.conflict.every((k) => r[k] === v[k])) : undefined;
        if (existing) {
          Object.assign(existing, v, { updated_at: now });
          written.push(existing);
        } else {
          const row: Row = { id: crypto.randomUUID(), created_at: now, updated_at: now, ...v };
          if (this.table === "messages") row.is_internal_note ??= false;
          store[this.table].push(row);
          written.push(row);
        }
      }
      return this.returning ? this.finish(written) : { data: null, error: null };
    }
    if (this.mode === "update") {
      const rows = this.matching();
      const real = store[this.table].filter((r) => rows.includes(r));
      if (this.table === "leads" && "stage" in this.patch && this.actor.role !== "service") {
        return { data: null, error: { message: "permission denied for table leads (use move_lead_stage)", code: "42501" } };
      }
      real.forEach((r) => Object.assign(r, this.patch, { updated_at: now }));
      return this.returning ? this.finish(real) : { data: null, error: null };
    }
    const rows = this.matching();
    store[this.table] = store[this.table].filter((r) => !rows.includes(r));
    return { data: null, error: null, count: rows.length };
  }
}

// ---------------------------------------------------------------------------
// RPC functions (same rules as supabase/migrations/0003)
// ---------------------------------------------------------------------------
function rpc(name: string, args: Record<string, unknown>, a: Actor): Result {
  const t = db();
  const now = new Date().toISOString();
  const audit = (action: string, entity: string, entityId: string, before: unknown, after: unknown) =>
    t.audit_log.push({
      id: crypto.randomUUID(),
      org_id: DEMO_ORG,
      actor_user_id: a.userId,
      action,
      entity,
      entity_id: entityId,
      before,
      after,
      created_at: now,
    });
  if (name === "log_audit") {
    audit(String(args.p_action), String(args.p_entity), String(args.p_entity_id ?? ""), args.p_before ?? null, args.p_after ?? null);
    return { data: null, error: null };
  }
  if (name === "move_lead_stage") {
    const lead = t.leads.find((l) => l.id === args.p_lead_id);
    const to = Number(args.p_to_stage);
    if (!lead) return { data: null, error: { message: "lead not found" } };
    const from = Number(lead.stage);
    if (a.role === "hospital_partner" && (lead.hospital_id !== a.hospitalId || from !== 4 || to !== 5))
      return { data: null, error: { message: "hospital partners may only mark their referred patients as admitted" } };
    if (a.role === "viewer") return { data: null, error: { message: "not allowed" } };
    if (to === from) return { data: lead, error: null };
    if (to === -1 && !String(args.p_reason ?? "").trim())
      return { data: null, error: { message: "a reason is required to mark a lead Lost" } };
    if (to === 4 && !lead.hospital_id) return { data: null, error: { message: "assign a hospital before marking Referred" } };
    Object.assign(lead, {
      stage: to,
      lost_reason: to === -1 ? args.p_reason : null,
      admitted_at: to === 5 ? (args.p_admitted_at ?? now) : lead.admitted_at,
      closed_at: to === 5 || to === -1 ? now : null,
      updated_at: now,
    });
    t.stage_events.push({
      id: crypto.randomUUID(),
      org_id: DEMO_ORG,
      lead_id: lead.id,
      from_stage: from,
      to_stage: to,
      actor_type: "user",
      actor_user_id: a.userId,
      reason: args.p_reason ?? null,
      created_at: now,
    });
    audit("lead.stage_changed", "leads", String(lead.id), { stage: from }, { stage: to, reason: args.p_reason ?? null });
    return { data: lead, error: null };
  }
  if (name === "export_patient") {
    if (a.role !== "admin") return { data: null, error: { message: "admin only" } };
    const p = t.patients.find((x) => x.id === args.p_patient_id);
    if (!p) return { data: null, error: { message: "patient not found" } };
    const leadIds = t.leads.filter((l) => l.patient_id === p.id).map((l) => l.id);
    const convIds = t.conversations.filter((c) => c.patient_id === p.id).map((c) => c.id);
    audit("patient.exported", "patients", String(p.id), null, null);
    return {
      data: {
        exported_at: now,
        patient: p,
        consents: t.consents.filter((c) => c.patient_id === p.id),
        leads: t.leads.filter((l) => l.patient_id === p.id),
        facts: t.lead_facts.filter((f) => leadIds.includes(f.lead_id)),
        stage_events: t.stage_events.filter((s) => leadIds.includes(s.lead_id)),
        calls: t.calls
          .filter((c) => leadIds.includes(c.lead_id))
          .map((c) => ({ started_at: c.started_at, outcome: c.outcome, duration_seconds: c.duration_seconds, notes: c.notes })),
        messages: t.messages
          .filter((m) => convIds.includes(m.conversation_id) && !m.is_internal_note)
          .map((m) => ({ created_at: m.created_at, direction: m.direction, sender: m.sender, type: m.type, body: m.body })),
        documents: t.documents
          .filter((d) => d.patient_id === p.id)
          .map((d) => ({ id: d.id, kind: d.kind, mime_type: d.mime_type, created_at: d.created_at })),
      },
      error: null,
    };
  }
  if (name === "anonymise_patient") {
    if (a.role !== "admin" && a.role !== "service") return { data: null, error: { message: "admin only" } };
    const p = t.patients.find((x) => x.id === args.p_patient_id);
    if (!p) return { data: null, error: { message: "patient not found" } };
    const leadIds = t.leads.filter((l) => l.patient_id === p.id).map((l) => l.id);
    const convIds = t.conversations.filter((c) => c.patient_id === p.id).map((c) => c.id);
    const paths = t.documents.filter((d) => d.patient_id === p.id).map((d) => d.storage_path);
    t.documents = t.documents.filter((d) => d.patient_id !== p.id);
    t.lead_facts = t.lead_facts.filter((f) => !leadIds.includes(f.lead_id));
    t.calls.filter((c) => leadIds.includes(c.lead_id)).forEach((c) => (c.notes = null));
    t.notes = t.notes.filter((n) => !leadIds.includes(n.lead_id));
    t.messages.filter((m) => convIds.includes(m.conversation_id)).forEach((m) => (m.body = null));
    Object.assign(p, {
      full_name: "Deleted patient",
      phone_e164: `anon:${p.id}`,
      age: null,
      gender: null,
      district: null,
      taluka: null,
      consent_whatsapp: false,
      opted_out_at: p.opted_out_at ?? now,
      deleted_at: now,
    });
    audit("patient.anonymised", "patients", String(p.id), null, { reason: args.p_reason, documents_removed: paths.length });
    return { data: paths, error: null };
  }
  return { data: null, error: { message: `rpc ${name} is not available in demo mode` } };
}

// ---------------------------------------------------------------------------
// Client factory
// ---------------------------------------------------------------------------
export function demoClient(a: Actor): SupabaseClient<Database> {
  const profile = a.userId ? db().profiles.find((p) => p.user_id === a.userId) : undefined;
  const client = {
    from: (table: string) => new Query(table, a),
    rpc: (name: string, args: Record<string, unknown> = {}) => Promise.resolve(rpc(name, args, a)),
    auth: {
      getUser: async () => ({
        data: { user: profile ? { id: a.userId, email: profile.email, last_sign_in_at: new Date().toISOString() } : null },
        error: null,
      }),
      signOut: async () => ({ error: null }),
      exchangeCodeForSession: async () => ({ data: null, error: null }),
      admin: {
        createUser: async (args: { email: string; app_metadata?: Record<string, unknown> }) => {
          const m = args.app_metadata ?? {};
          const userId = crypto.randomUUID();
          db().profiles.push({
            user_id: userId,
            org_id: m.org_id ?? DEMO_ORG,
            full_name: m.full_name ?? "",
            email: args.email,
            role: m.role ?? "viewer",
            hospital_id: m.hospital_id ?? null,
            is_active: true,
          });
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({ data: { signedUrl: "/demo-document.svg" }, error: null }),
        remove: async () => ({ data: [], error: null }),
        upload: async () => ({ data: { path: "demo" }, error: null }),
      }),
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

export type DemoRole = "admin" | "coordinator" | "hospital_partner" | "viewer";
export function demoActor(role: DemoRole | "service", userId: string | null, hospitalId: string | null): Actor {
  return { role, userId, hospitalId };
}

export function resetDemoData(): void {
  globalState.__hcDemo = buildDemoData();
}
