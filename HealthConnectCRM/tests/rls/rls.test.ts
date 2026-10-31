import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ids, seed } from "./fixtures";
import { asUser, createTestDatabase, dropTestDatabase } from "./harness";

const DB_NAME = "hcrm_rls_test";
let db: Client;

beforeAll(async () => {
  db = await createTestDatabase(DB_NAME);
  await seed(db);
}, 60_000);

afterAll(async () => {
  if (db) await dropTestDatabase(db, DB_NAME);
});

const count = async (userId: string | null, table: string) =>
  asUser(db, userId, async (q) => Number((await q(`select count(*)::int as n from ${table}`))[0].n));

describe("RLS is enabled everywhere", () => {
  it("every public table has RLS enabled and forced", async () => {
    const rows = (
      await db.query(
        `select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relkind = 'r' and not (c.relrowsecurity and c.relforcerowsecurity)`,
      )
    ).rows;
    expect(rows).toEqual([]);
  });
});

describe("org isolation", () => {
  it("coordinator in org A sees only org A patients and leads", async () => {
    expect(await count(ids.coordA, "patients")).toBe(3);
    expect(await count(ids.coordA, "leads")).toBe(3);
    expect(await count(ids.coordB, "patients")).toBe(1);
  });

  it("cannot read an org B lead by id", async () => {
    const rows = await asUser(db, ids.coordA, (q) => q("select id from leads where id = $1", [ids.leadB]));
    expect(rows).toEqual([]);
  });

  it("cannot insert a patient into another org", async () => {
    await expect(
      asUser(db, ids.coordA, (q) =>
        q("insert into patients (org_id, full_name, phone_e164) values ($1, 'x', '+919811111111')", [ids.orgB]),
      ),
    ).rejects.toThrow(/row-level security/);
  });

  it("inactive users see nothing", async () => {
    expect(await count(ids.inactiveA, "patients")).toBe(0);
    expect(await count(ids.inactiveA, "leads")).toBe(0);
  });

  it("anon sees nothing", async () => {
    await expect(
      db.query("begin").then(async () => {
        try {
          await db.query("set local role anon");
          return await db.query("select * from patients");
        } finally {
          await db.query("rollback");
        }
      }),
    ).rejects.toThrow(/permission denied/);
  });
});

describe("hospital partner", () => {
  it("sees only their own hospital's referred patients", async () => {
    const leads = await asUser(db, ids.partnerA1, (q) => q("select id from leads order by id"));
    expect(leads.map((r) => r.id)).toEqual([ids.leadReferredA1]);
    const patients = await asUser(db, ids.partnerA1, (q) => q("select id from patients"));
    expect(patients.map((r) => r.id)).toEqual([ids.patReferredA1]);
  });

  it("cannot read another hospital's patient even by id", async () => {
    const rows = await asUser(db, ids.partnerA1, (q) => q("select id from patients where id = $1", [ids.patReferredA2]));
    expect(rows).toEqual([]);
  });

  it("does not see their hospital's leads before Referred", async () => {
    const rows = await asUser(db, ids.partnerA1, (q) => q("select id from leads where id = $1", [ids.leadNewA1]));
    expect(rows).toEqual([]);
  });

  it("has no access to messages or documents (incl. Aadhaar)", async () => {
    expect(await count(ids.partnerA1, "messages")).toBe(0);
    expect(await count(ids.partnerA1, "documents")).toBe(0);
    expect(await count(ids.partnerA1, "conversations")).toBe(0);
  });

  it("cannot update leads directly", async () => {
    const rows = await asUser(db, ids.partnerA1, (q) =>
      q("update leads set bot_enabled = false where id = $1 returning id", [ids.leadReferredA1]),
    );
    expect(rows).toEqual([]);
  });

  it("move by partner writes the lead, a stage_event and an audit row", async () => {
    await db.query("begin");
    try {
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: ids.partnerA1 })]);
      await db.query("select move_lead_stage($1, 5::smallint, 'admitted')", [ids.leadReferredA1]);
      await db.query("reset role");
      const lead = (await db.query("select stage, admitted_at from leads where id = $1", [ids.leadReferredA1])).rows[0];
      expect(lead.stage).toBe(5);
      expect(lead.admitted_at).not.toBeNull();
      const ev = (await db.query("select from_stage, to_stage, actor_type, actor_user_id from stage_events where lead_id = $1", [ids.leadReferredA1])).rows;
      expect(ev).toEqual([{ from_stage: 4, to_stage: 5, actor_type: "user", actor_user_id: ids.partnerA1 }]);
      const audit = (await db.query("select action from audit_log where entity_id = $1", [ids.leadReferredA1])).rows;
      expect(audit.map((a) => a.action)).toContain("lead.stage_changed");
    } finally {
      await db.query("rollback");
    }
  });

  it("cannot mark another hospital's patient admitted", async () => {
    await expect(
      asUser(db, ids.partnerA1, (q) => q("select move_lead_stage($1, 5::smallint, 'x')", [ids.leadReferredA2])),
    ).rejects.toThrow(/only mark their referred patients/);
  });

  it("cannot move a lead to any stage other than Admitted", async () => {
    await expect(
      asUser(db, ids.partnerA1, (q) => q("select move_lead_stage($1, -1::smallint, 'x')", [ids.leadReferredA1])),
    ).rejects.toThrow(/only mark their referred patients/);
  });
});

describe("viewer", () => {
  it("sees no personal data", async () => {
    for (const t of ["patients", "leads", "messages", "documents", "lead_facts", "consents", "notes"]) {
      expect(await count(ids.viewerA, t)).toBe(0);
    }
  });

  it("sees aggregates for their own org only", async () => {
    const rows = await asUser(db, ids.viewerA, (q) => q("select sum(leads)::int as n from v_funnel"));
    expect(rows[0].n).toBe(3);
  });

  it("partner gets nothing from aggregate views", async () => {
    const rows = await asUser(db, ids.partnerA1, (q) => q("select count(*)::int as n from v_funnel"));
    expect(rows[0].n).toBe(0);
  });
});

describe("stage rules", () => {
  it("coordinator cannot write stage directly", async () => {
    await expect(
      asUser(db, ids.coordA, (q) => q("update leads set stage = 5 where id = $1", [ids.leadNewA1])),
    ).rejects.toThrow(/permission denied/);
  });

  it("Lost requires a reason", async () => {
    await expect(
      asUser(db, ids.coordA, (q) => q("select move_lead_stage($1, -1::smallint, '')", [ids.leadNewA1])),
    ).rejects.toThrow(/reason is required/);
  });

  it("bot can move forward up to Eligible only", async () => {
    await asUser(db, null, async (q) => {
      await q("select move_lead_stage($1, 3::smallint, 'docs ok', null, 'bot')", [ids.leadNewA1]);
      const r = await q("select stage from leads where id = $1", [ids.leadNewA1]);
      expect(r[0].stage).toBe(3);
    });
    await expect(
      asUser(db, null, (q) => q("select move_lead_stage($1, 4::smallint, 'x', null, 'bot')", [ids.leadNewA1])),
    ).rejects.toThrow(/forward up to Eligible/);
  });

  it("bot cannot move backwards", async () => {
    await expect(
      asUser(db, null, async (q) => {
        await q("select move_lead_stage($1, 2::smallint, 'x', null, 'bot')", [ids.leadNewA1]);
        await q("select move_lead_stage($1, 1::smallint, 'x', null, 'bot')", [ids.leadNewA1]);
      }),
    ).rejects.toThrow(/forward up to Eligible/);
  });

  it("a user session cannot impersonate the bot", async () => {
    await asUser(db, ids.coordA, async (q) => {
      await q("select move_lead_stage($1, 1::smallint, 'called', null, 'bot')", [ids.leadNewA1]);
      const ev = await q("select actor_type, actor_user_id from stage_events where lead_id = $1", [ids.leadNewA1]);
      expect(ev).toEqual([{ actor_type: "user", actor_user_id: ids.coordA }]);
    });
  });

  it("anon cannot call move_lead_stage", async () => {
    await db.query("begin");
    try {
      await db.query("set local role anon");
      await expect(db.query("select move_lead_stage($1, 1::smallint)", [ids.leadNewA1])).rejects.toThrow(
        /permission denied/,
      );
    } finally {
      await db.query("rollback");
    }
  });
});

describe("audit log", () => {
  it("is append-only even for the service role", async () => {
    await expect(asUser(db, null, (q) => q("delete from audit_log"))).rejects.toThrow(/append-only/);
  });

  it("users cannot insert audit rows directly", async () => {
    await expect(
      asUser(db, ids.adminA, (q) => q("insert into audit_log (action, entity) values ('fake', 'x')")),
    ).rejects.toThrow(/permission denied/);
  });

  it("role changes are audited and admins cannot demote themselves", async () => {
    await asUser(db, ids.adminA, async (q) => {
      await q("update profiles set role = 'admin' where user_id = $1", [ids.coordA]);
      const a = await q("select action from audit_log where entity_id = $1 and action = 'profile.role_changed'", [ids.coordA]);
      expect(a).toHaveLength(1);
    });
    await expect(
      asUser(db, ids.adminA, (q) => q("update profiles set role = 'viewer' where user_id = $1", [ids.adminA])),
    ).rejects.toThrow(/cannot change your own role/);
  });

  it("coordinator cannot change roles", async () => {
    const rows = await asUser(db, ids.coordA, (q) =>
      q("update profiles set role = 'admin' where user_id = $1 returning user_id", [ids.coordA]),
    );
    expect(rows).toEqual([]);
  });
});

describe("privacy tools", () => {
  it("admin export is audited; coordinator cannot export", async () => {
    await asUser(db, ids.adminA, async (q) => {
      const out = await q("select export_patient($1) as j", [ids.patReferredA1]);
      const j = out[0].j as { patient: { full_name: string } };
      expect(j.patient.full_name).toBe("Referred A1");
      const a = await q("select action from audit_log where entity_id = $1", [ids.patReferredA1]);
      expect(a.map((r) => r.action)).toContain("patient.exported");
    });
    await expect(
      asUser(db, ids.coordA, (q) => q("select export_patient($1)", [ids.patReferredA1])),
    ).rejects.toThrow(/admin only/);
  });

  it("anonymise removes personal data, returns document paths and is audited", async () => {
    await asUser(db, ids.adminA, async (q) => {
      const r = await q("select anonymise_patient($1, 'patient request') as paths", [ids.patReferredA1]);
      expect(r[0].paths).toEqual([`${ids.orgA}/x/aadhaar.jpg`]);
      const p = await q("select full_name, phone_e164, deleted_at from patients where id = $1", [ids.patReferredA1]);
      expect(p[0].full_name).toBe("Deleted patient");
      expect(String(p[0].phone_e164)).toMatch(/^anon:/);
      expect(await q("select 1 from documents where patient_id = $1", [ids.patReferredA1])).toEqual([]);
      const m = await q("select body from messages");
      expect(m.every((row) => row.body === null)).toBe(true);
      const a = await q("select action from audit_log where entity_id = $1", [ids.patReferredA1]);
      expect(a.map((row) => row.action)).toContain("patient.anonymised");
    });
  });

  it("admin cannot export another org's patient", async () => {
    await expect(asUser(db, ids.adminA, (q) => q("select export_patient($1)", [ids.patB]))).rejects.toThrow(
      /not found/,
    );
  });
});

describe("webhook_events", () => {
  it("is not readable by any user role", async () => {
    await db.query("insert into webhook_events (provider, event_key, payload) values ('meta', 'k1', '{}')");
    expect(await count(ids.adminA, "webhook_events")).toBe(0);
    expect(await count(null, "webhook_events")).toBe(1);
  });
});
