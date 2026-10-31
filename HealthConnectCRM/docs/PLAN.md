# PLAN — HealthConnectCRM (Phase 0)

Approved by the owner on 2026-10-30 ("go ahead with app"). Implementation follows `CLAUDE.md`.

## Folder structure
```
app/
  (dashboard)/            coordinator/admin screens: dashboard, pipeline, inbox, leads/[id], tasks, hospitals, settings, privacy, users
  portal/                 hospital partner portal
  login/, auth/callback/  Supabase Auth (email OTP + Google)
  privacy/, terms/        public legal pages (needed by Meta)
  api/health, api/inngest, api/webhooks/{meta,whatsapp}
lib/
  env.ts log.ts phone.ts stages.ts
  meta/      webhook payload schema, signature, Graph client, field mapping
  whatsapp/  webhook schema, send policy + sender, opt-out detection
  ai/        provider interface, anthropic + gemini adapters, prompts/, output schema, guardrails, bot turn
  db/        supabase clients (server/admin/browser)
  auth/      session + role guards
  audit/     audit log writer
inngest/     client + functions
supabase/migrations/   SQL
tests/{unit,rls,e2e,bot-evals}/
```

## Migrations
1. `0001_core.sql` — extensions, helper functions (`auth_org_id`, `auth_role`, `auth_hospital_id`), all §5 tables + `kb_articles`, indexes, `updated_at` triggers, append-only `audit_log`.
2. `0002_rls.sql` — RLS on every table, policies per role.
3. `0003_functions_views.sql` — `move_lead_stage`, `v_funnel`, `v_campaign_performance`, hospital-portal function, profile trigger on signup.
4. `0004_storage_realtime.sql` — private `documents` bucket + policies, Realtime publication (guarded so tests run on plain Postgres).

## API routes
`GET /api/health` · `GET|POST /api/webhooks/meta` · `GET|POST /api/webhooks/whatsapp` · `GET|POST|PUT /api/inngest`

## Inngest functions
`lead-received` (fetch lead → upsert patient/lead/consent → assign → greeting) · `wa-message-received` (store message, opt-out, media → storage, bot turn) · `wa-status` · `meta-backfill` (every 15 min) · `nightly-maintenance` (template sync, purge webhook_events > 30 d, retention) · `lead-followups` (2 h / 24 h timers) · `needs-human-escalation`.

## Decisions / risks
- **Lost stage** stored as `-1` (stages 0–5 per §2).
- **Viewer** gets no access to personal-data tables; dashboards for viewers read only aggregate views.
- **Hospital partner** reads leads/patients of their hospital at stage ≥ 4 only; never messages/documents; admission only via `move_lead_stage`.
- **Generated DB types**: `supabase gen types` needs a live project; until then `lib/db/types.ts` is hand-written for the tables the code touches. Regenerate once the project exists.
- **RLS tests** run against plain Postgres 16 with a minimal `auth` schema shim (`tests/rls/setup.sql`) that mirrors Supabase's `auth.uid()`; re-run against `supabase start` in CI once Docker is available.
- **Bot evals** require a live paid AI key; the runner reports "not run" without one rather than faking results.
- Meta / WhatsApp / Inngest / Sentry need real accounts (CLAUDE.md Part C) — nothing end-to-end can be proven without them.
