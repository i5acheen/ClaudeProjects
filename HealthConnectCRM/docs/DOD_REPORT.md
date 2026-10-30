# Definition of Done report — HealthConnectCRM

Run date: 2026-10-30 · Source: `CLAUDE.md` §13 · Environment checked: this repository (no production deployment exists).

**Result: 0 / 7 pass.** Every item fails for the same reason: phases 1–8 of `CLAUDE.md` Part B
(the application itself) have not been built. The repository contains only the brief, production
config and docs. These are honest fails, not flaky ones — nothing was mocked to make them look green.

Evidence common to all items (command output from the repo root):

```
$ find . -type f | sort
./.env.example
./.gitignore
./CLAUDE.md
./docs/DOD_REPORT.md
./docs/PRODUCTION.md
./docs/RUNBOOK.md
./vercel.json
$ ls package.json app supabase tests .github
ls: cannot access 'package.json': No such file or directory
ls: cannot access 'app': No such file or directory
ls: cannot access 'supabase': No such file or directory
ls: cannot access 'tests': No such file or directory
ls: cannot access '.github': No such file or directory
```

No Vercel project, Supabase project, Inngest app, Meta app or WhatsApp number is connected, so no
end-to-end test against live services was possible.

| # | Definition of Done item | Result | Evidence | Unblocked by |
|---|---|---|---|---|
| 1 | Test Meta lead appears in CRM < 10 s; greeting delivered on WhatsApp | **FAIL** | No `/api/webhooks/meta` route, no Inngest `lead.received`, no deployment, no Meta app connected | Phases 1, 2, 4, 5 + `docs/PRODUCTION.md` §7 |
| 2 | WhatsApp reply gets correct Marathi bot reply < 10 s; facts + stage update; documents land in profile | **FAIL** | No `/api/webhooks/whatsapp`, no `lib/ai/`, no `lead_facts` / `documents` tables | Phases 2, 5, 6 |
| 3 | "Talk to a person" → handover + coordinator alert; bot silent afterwards | **FAIL** | No bot, no handover logic, no notifications | Phases 6, 7 |
| 4 | Hospital partner sees only their referred patients and can mark admission | **FAIL** | No migrations / RLS policies, no RLS tests, no hospital portal | Phases 2, 8 |
| 5 | Dashboard numbers match DB counts; campaign table shows admissions per ad | **FAIL** | No dashboard, no `v_funnel` / `v_campaign_performance` | Phases 3, 7 |
| 6 | CI green: lint, types, unit, e2e, RLS tests, bot evals ≥ 95 % | **FAIL** | No `package.json`, no `.github/workflows`, no tests, no `tests/bot-evals` | Phases 1, 2, 6 |
| 7 | Privacy export and deletion work and are audited | **FAIL** | No privacy tools, no `audit_log` table | Phases 2, 8 |

## What Phase 9 did deliver (checked)

| Phase 9 item | Status | Evidence |
|---|---|---|
| Vercel functions region `bom1` | Config ready | `vercel.json` → `"regions": ["bom1"]` (parsed with `json.load`) |
| Environment variables checklist | Done | `docs/PRODUCTION.md` §5; `.env.example` keys diffed against `CLAUDE.md` §11 → identical |
| Supabase prod in ap-south-1 with backups | Steps written, not provisioned | `docs/PRODUCTION.md` §1 (Pro + PITR, restore test) |
| Sentry alerts | Rules specified, not created | `docs/PRODUCTION.md` §6 |
| Inngest production app | Steps written, not provisioned | `docs/PRODUCTION.md` §4 |
| Custom domain | Steps written, not provisioned | `docs/PRODUCTION.md` §3 |
| `docs/RUNBOOK.md` | Done | Deploy, rollback, token rotation, webhooks down, WhatsApp quality drop, bot misbehaving + global kill switch (4 methods) |

## How to re-run

After phases 1–8 and the production setup, re-run Phase 9's DoD against the production domain:
1. Meta Lead Ads Testing Tool → submit lead → time until it shows in Pipeline; screenshot of WhatsApp greeting.
2. Reply from a test phone in Marathi → time to bot reply; check `lead_facts`, `stage_events`, send a document photo → profile gallery.
3. Send "मला माणसाशी बोलायचं आहे" → `needs_human = true`, coordinator notification, send another message → no bot reply (`bot_runs` has no new row).
4. Log in as hospital partner A → only hospital A, stage ≥ Referred; RLS test output for hospital B isolation; mark admitted.
5. Compare dashboard KPIs with SQL counts per stage; campaign table admissions per `meta_ad_id`.
6. Link to the green CI run on `main`; bot-eval runner pass rate.
7. Export + delete a sample patient; show the `audit_log` rows.
