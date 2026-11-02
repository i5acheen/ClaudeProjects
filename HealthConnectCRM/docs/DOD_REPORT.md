# Definition of Done report — HealthConnectCRM

## Update 2026-11-02 — re-run on the self-hosted stack

Run against the full self-hosted stack (`docs/SELF_HOSTING.md`) brought up in a test environment: real
Supabase Auth/PostgREST/Storage/Realtime, self-hosted Inngest, e-mailed login codes (Mailpit). Not a production
server, and Meta / WhatsApp / AI were not connected.

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Meta test lead in CRM < 10 s, greeting delivered | ⛔ BLOCKED | Needs the Meta app, WhatsApp number and a public server. |
| 2 | Marathi bot reply < 10 s; facts/stage; documents | ⛔ BLOCKED | Needs live WhatsApp and an AI model. The pipeline up to the model is proven (webhook → Inngest → bot turn). |
| 3 | "Talk to a person" → handover + alert; bot silent after | 🟡 **PASS except delivery** | Signed WhatsApp webhook → Inngest: `bot_runs.guardrail_flags = {asked_for_person}`, lead `needs_human = true`, Marathi handover reply composed, coordinator notification "Patient needs a coordinator (asked_for_person)". A follow-up message was stored with **0** bot runs. Sending to WhatsApp failed only because the credentials were fake. |
| 4 | Hospital partner sees only their referred patients and can mark admission | ✅ **PASS** | Playwright `crm.spec.ts` against the stack: vascular partner sees only SAMPLE — Vithal D. and marks admission; spine partner sees none; partner redirected away from `/pipeline`. Plus 37/37 RLS tests. |
| 5 | Dashboard numbers match DB; admissions per ad | ✅ **PASS** | Playwright compares Eligible/Referred tiles with service-role `count(*)`; campaign table shows ad `AD100`. |
| 6 | CI green incl. bot evals ≥ 95 % | ❌ FAIL | Unchanged: CI can't run until the code is in its own repo; bot evals need a model (see SELF_HOSTING "AI choices"). Locally: lint, format, types, 107 unit, 37 RLS, build, 18 public + 17 stack e2e all pass. |
| 7 | Privacy export and deletion work and are audited | ✅ **PASS** | Playwright: export downloads `patient-<id>.json`, anonymisation succeeds, `audit_log` has `patient.exported` and `patient.anonymised`. |

**Result: 3 pass, 1 pass except WhatsApp delivery, 2 blocked, 1 fail.**

---

## Original report (2026-10-31, before the self-hosted stack)

Run: 2026-10-31 · Source: `CLAUDE.md` §13 · Where: the build container for this repo (Postgres 16 local,
Chromium; **no** Supabase cloud project, Vercel deployment, Meta app, WhatsApp number, Inngest app or AI key).

**Result: 0 of 7 items pass end to end. 6 are blocked, 1 fails.** The DoD items are live, end-to-end checks
(a real Meta lead, a real WhatsApp reply, a deployed dashboard), and none of those services exists yet. Each one
needs accounts only the owner can create (CLAUDE.md Part C). The code paths behind every item are built, and
their offline tests are listed as evidence below. None of these items is marked as passing on the strength of
offline tests alone.

## Checks that ran here

| Check | Result |
|---|---|
| `npm run lint` (ESLint, `no-explicit-any` = error) | ✅ exit 0 |
| `npm run format:check` | ✅ all files formatted |
| `npm run typecheck` (`tsc --noEmit`, strict) | ✅ 0 errors |
| `npm test` (Vitest unit + MSW) | ✅ 105/105 in 9 files |
| `npm run test:rls` (RLS on real Postgres 16 with a Supabase `auth` shim) | ✅ 36/36. Mutation check: loosening the partner policy makes 2 tests fail, so the tests do catch regressions. |
| `npm audit --omit=dev --audit-level=high` | ✅ 0 high/critical (5 moderate; see SECURITY_REVIEW F6) |
| `npm run build` (Next.js production build) | ✅ compiled, 22 routes |
| `npm run test:e2e` (Playwright, desktop + Pixel 7) | ✅ 18/18 public specs; ⏭ 8 Supabase-backed specs skipped (need `supabase start`, which needs Docker) |
| `npm run bot-evals` (live model) | ⛔ `not_run`: no AI API key in this environment |
| `npm run bot-evals -- --offline` (stub model, harness self-test) | 24/40. This is expected: the stub gives fixed replies, so content checks fail by design. All deterministic safety cases pass (emergency ×4, handover, medical ×3, money, abuse ×2, documents ×2, no-progress). It shows the harness works and catches failures. **It is not a quality score.** |

## Definition of Done items

| # | Item | Result | Evidence | What's needed to pass |
|---|---|---|---|---|
| 1 | Test Meta lead appears in the CRM in under 10 s, with the greeting delivered on WhatsApp | ⛔ **BLOCKED** | Code path: `app/api/webhooks/meta/route.ts` (verify → store → enqueue), `inngest/functions/lead-received.ts`, `lib/crm/leads.ts` (idempotent upsert), greeting via `lib/whatsapp/send.ts`. Tests: route valid/bad signature/duplicate/missing fields (`tests/unit/webhook-routes.test.ts`), Graph client + paging (`clients.msw.test.ts`), mapping/consent (`mapping.test.ts`), send policy (`policy.test.ts`). | Meta app + Page token, WhatsApp number + approved `lead_greeting_*`, deployment (docs/META_SETUP.md, WHATSAPP_SETUP.md, PRODUCTION.md). Then submit a lead with the Lead Ads Testing Tool and time it. |
| 2 | WhatsApp reply gets a correct Marathi bot reply in under 10 s; facts and stage update; documents land in the profile | ⛔ **BLOCKED** | `inngest/functions/wa-message-received.ts` (store → opt-out → media → bot gate → `runBotTurn` → facts/stage/`bot_runs` → reply). `lib/ai/bot.ts` tests cover the Marathi reply, facts, forward-only stage capped at 3, JSON repair, guardrails, 16-message history, Aadhaar masking, caption-based document kind (`bot.test.ts`). Media download is tested with MSW. Bot timeout is 8 s with `effort: "low"`. | Live WhatsApp number, AI API key, deployment; send a Marathi message from a test phone and time the reply. |
| 3 | "Talk to a person" triggers handover and a coordinator alert; the bot stays silent afterwards | ⛔ **BLOCKED** | Deterministic trigger (no model call) is tested: `bot.test.ts` "'talk to a person' hands over", `guardrails.test.ts`, eval case `hu-01-person`. Worker sets `needs_human`, emits `crm/lead.needs_human` → `needs-human-escalation` notifies the assignee (or all staff), escalates to admins after 30 min; Alerts page + 🔔 badge. Bot gate skips when `needs_human` or `bot_enabled=false`. | Live WhatsApp + Inngest. Send "मला माणसाशी बोलायचं आहे", confirm the alert, send again, confirm no reply and no new `bot_runs` row. |
| 4 | Hospital partner sees only their referred patients and can mark admission | ⛔ **BLOCKED** (DB layer proven) | RLS tests on real Postgres: partner sees only their hospital at stage ≥ 4, cannot read another hospital's patient by id, sees no messages/documents/Aadhaar, cannot update leads, can move 4→5 only for their hospital (stage_event + audit written), cannot mark another hospital's patient. Portal UI: `app/portal`. E2E specs written (`crm.spec.ts`: partner-vascular vs partner-spine) and skipped here. | Run the Supabase-backed E2E (CI job `e2e`, or locally with Docker: `supabase start` + `E2E_SUPABASE=1 npm run test:e2e`). |
| 5 | Dashboard numbers match database counts; campaign table shows admissions per ad | ⛔ **BLOCKED** | KPIs are direct `count(*)` queries and SQL views (`v_funnel`, `v_campaign_performance` with `meta_ad_id` + admitted, `v_response_times`, `v_template_counts`). Viewer aggregate access is tested in RLS. E2E spec compares KPI tiles with service-role counts and checks the `AD100` row. | Same as #4 (Supabase-backed E2E). |
| 6 | CI green: lint, types, unit, e2e, RLS tests, bot evals ≥ 95 % | ❌ **FAIL** | Lint, format, types, unit, RLS, audit and build pass locally (table above). `.github/workflows/ci.yml` defines all jobs. Fails because: (a) bot evals have not run against a live model, and (b) CI has never run: the project is not yet in its own repo, and the workflow sits in a subfolder of `i5acheen/ClaudeProjects`, where GitHub doesn't run it. | Move to the `HealthConnectCRM` repo, add the `ANTHROPIC_API_KEY` secret, open a PR, and confirm all jobs pass, with bot evals at ≥ 95 %. |
| 7 | Privacy export and deletion work and are audited | ⛔ **BLOCKED** (DB layer proven) | RLS tests: admin export returns the patient bundle and writes `patient.exported`; coordinator gets "admin only"; anonymise removes PII, deletes documents and returns their storage paths, nulls message bodies, writes `patient.anonymised`; cross-org export refused. UI: `/privacy`. E2E spec written (download + delete + audit rows) and skipped here. | Supabase-backed E2E run (the storage file deletion needs real Storage). |

## Phase 9 production items

| Item | Status |
|---|---|
| Vercel project, region `bom1` | Config ready: `vercel.json` `regions: ["bom1"]`. Project **not created** (needs your Vercel team). |
| Environment variables checklist | Done: docs/PRODUCTION.md §5 and `.env.example`; boot-time zod validation; `/api/health` reports invalid variable names (e2e-tested). |
| Supabase production project, ap-south-1, backups | Steps written (Pro + PITR + restore test). Migrations 0001–0006 apply cleanly. **Not provisioned.** |
| Sentry alerts | SDK wired (server + client, PII scrubbing, `onRequestError`); alert rules specified in PRODUCTION.md §6. **Not created.** |
| Inngest production app | 8 functions served at `/api/inngest`; setup steps in PRODUCTION.md §4. **Not created.** |
| Custom domain | Steps written. **Not configured.** |
| docs/RUNBOOK.md | Done, and updated to match the code: function ids, a real global bot switch (Settings toggle, audited), SQL fallback, safe Inngest pause procedure, invalid-key last resort. |

## Known gaps against CLAUDE.md (not DoD items)
- Pipeline **saved views** and **bulk assign**; round-robin ignores **working hours**; optional **staff email**
  notifications and the optional **Conversions API** (Phase 7) are not implemented.
- Rate limiting is left to Vercel Firewall rules (SECURITY_REVIEW F8); the CSP still allows inline scripts (F7).
- `lib/db/types.ts` is generated from the migrations by `scripts/gen-db-types.ts`. Regenerate it with
  `supabase gen types` once the project exists.
