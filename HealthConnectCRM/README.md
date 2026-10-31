# HealthConnectCRM

Patient Lead CRM for a patient coordination service in Chhatrapati Sambhajinagar, Maharashtra —
Meta Lead Ads + WhatsApp Cloud API + an AI assistant ("Sahayak") that helps patients access MJPJAY / PM-JAY
treatment at empanelled hospitals. Spec: [`CLAUDE.md`](CLAUDE.md).

**Stack:** Next.js 15 (App Router, TS strict) · Tailwind · next-intl (en/mr) · Supabase (Postgres + RLS, Auth, Storage; Mumbai) ·
Inngest · Anthropic / Gemini (provider-agnostic) · Sentry · Vercel `bom1` · Vitest · Playwright · MSW.

## Run locally
```bash
npm ci
```
```bash
supabase start            # local Postgres/Auth/Storage, applies supabase/migrations + seed.sql (sample data)
```
```bash
cp .env.example .env.local   # fill from `supabase status` and your Meta/WhatsApp/AI test credentials
```
```bash
npx inngest-cli@latest dev   # local Inngest dev server
```
```bash
npm run dev
```
Create your first admin user in Supabase Studio (Auth → Add user) with app_metadata
`{"org_id":"00000000-0000-4000-8000-000000000001","role":"admin"}`, then sign in with an email code.

## Checks
| Command | What |
|---|---|
| `npm run lint` / `npm run format:check` / `npm run typecheck` | static checks |
| `npm test` | unit tests (webhooks, signatures, send policy, guardrails, bot turn, MSW-mocked Meta/WhatsApp) |
| `TEST_DATABASE_URL=postgres://… npm run test:rls` | RLS/isolation tests on a real Postgres |
| `npm run test:e2e` | Playwright; `E2E_SUPABASE=1` adds the Supabase-backed CRM flows |
| `ANTHROPIC_API_KEY=… npm run bot-evals` | 40 scripted conversations against the live model (≥ 95 % required) |
| `npm run db:types` | regenerate `lib/db/types.ts` from the migrations |

## Layout
`app/(dashboard)` coordinator/admin screens · `app/portal` hospital partner · `app/api/webhooks/{meta,whatsapp}` ·
`app/api/inngest` · `lib/{meta,whatsapp,ai,crm,db,auth,audit}` · `inngest/functions` · `supabase/migrations` ·
`tests/{unit,rls,e2e,bot-evals}`.

## Docs
[PLAN](docs/PLAN.md) · [Production setup](docs/PRODUCTION.md) · [Runbook](docs/RUNBOOK.md) ·
[Meta setup](docs/META_SETUP.md) · [WhatsApp setup](docs/WHATSAPP_SETUP.md) ·
[Security review](docs/SECURITY_REVIEW.md) · [Definition of Done report](docs/DOD_REPORT.md)
