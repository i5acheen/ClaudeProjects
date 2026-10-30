# Production setup — HealthConnectCRM

Phase 9 of `CLAUDE.md`. This is the one-time setup for the production stack. Do it in
order: each section depends on the one before it. Tick each box as you go.

> **Status (2026-10-30):** the infrastructure config in this repo is ready
> (`vercel.json` pins functions to `bom1`, security headers, `.env.example`).
> The application from phases 1–8 has **not been built yet**, so nothing below
> has been provisioned. See `docs/DOD_REPORT.md`.

| Service | Region / plan | Why |
|---|---|---|
| Vercel | Functions in `bom1` (Mumbai), Pro plan | Low latency to Supabase + patients; India hosting (DPDP) |
| Supabase | `ap-south-1` (Mumbai), Pro plan + PITR add-on | India data residency; backups before real patient data |
| Inngest | Production environment | Durable jobs, retries, cron |
| Sentry | Org + project `healthconnectcrm` | Errors, performance, alerts |
| Domain | e.g. `crm.<yourdomain>.in` | Required by Meta (privacy policy URL, webhook callback) |

---

## 1. Supabase production project (ap-south-1)

- [ ] Create a **new** project (do not promote the dev project): Organization → New project →
      Region **South Asia (Mumbai) – ap-south-1**. Name `healthconnectcrm-prod`.
      Store the DB password in your password manager, not in the repo.
- [ ] Upgrade the org to **Pro** and enable the **Point-in-Time Recovery** add-on
      (Project Settings → Add-ons → PITR, 7 days minimum). Pro alone gives daily backups;
      PITR lets you restore to any second — required before real patients (CLAUDE.md §10).
- [ ] Apply migrations from CI or a trusted laptop, never from the dashboard SQL editor:
      ```bash
      supabase link --project-ref <prod-ref>
      ```
      ```bash
      supabase db push
      ```
- [ ] Verify RLS is on for every table (must return zero rows):
      ```sql
      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
      ```
- [ ] Storage: bucket `documents` exists and is **private** (`public = false`).
- [ ] Auth → URL configuration: Site URL = `https://<domain>`; redirect URLs = `https://<domain>/**` only.
- [ ] Auth → Providers: Email OTP on; Google on with the production OAuth client; disable sign-ups
      that are not pre-invited (users are created by an admin).
- [ ] Auth → Sessions: time-box sessions to 12 h (CLAUDE.md §10).
- [ ] Network restrictions: restrict direct DB connections to your office/CI IPs if you use them.
- [ ] Create the first org row and the first admin profile by SQL; everyone else is invited from the app.
- [ ] Test a restore once: Database → Backups → restore to a **new** project and check row counts.

## 2. Vercel project (bom1)

- [ ] Import the GitHub repo `HealthConnectCRM` → Framework: Next.js. Team plan: Pro.
- [ ] Settings → Functions → Function Region: **Mumbai (bom1)**. `vercel.json` also pins
      `"regions": ["bom1"]`, so the setting and the file agree.
- [ ] Production branch: `main`. Preview deployments for PRs, protected with Vercel Authentication
      (previews must never point at the production Supabase project).
- [ ] Set every variable from the checklist in §5 for **Production**; set separate dev/staging values
      for **Preview**. Mark secrets as *Sensitive*.
- [ ] Firewall: add rate-limit rules for `/api/webhooks/*` and `/login` (CLAUDE.md §10), or ship the
      Upstash Ratelimit middleware.
- [ ] Enable Deployment Protection → "Standard protection" (previews only); production stays public
      because Meta must reach the webhooks.

## 3. Custom domain

- [ ] Vercel → Project → Domains → add `crm.<yourdomain>.in` and follow the DNS record it shows
      (CNAME to Vercel). Wait for the certificate to be issued.
- [ ] Redirect the `*.vercel.app` production URL to the custom domain.
- [ ] Set `APP_BASE_URL=https://crm.<yourdomain>.in`.
- [ ] Publish `/privacy` and `/terms` on this domain; use these URLs in the Meta app, Meta lead forms
      and the WhatsApp Business profile.
- [ ] HSTS header (already in `vercel.json`) — submit to the preload list only after a week of clean HTTPS.

## 4. Inngest production app

- [ ] Inngest Cloud → create/choose the **Production** environment.
- [ ] Install the Inngest ↔ Vercel integration (recommended; it sets `INNGEST_EVENT_KEY` and
      `INNGEST_SIGNING_KEY` and re-syncs on every deploy) **or** copy both keys into Vercel by hand
      and add `https://<domain>/api/inngest` as the app URL.
- [ ] After the first deploy, check Apps → `healthconnectcrm` lists every function
      (`lead.received`, `wa.message.received`, `wa.status`, backfill, nightly jobs, SLA timers).
- [ ] Turn on failure notifications (Inngest → Alerts/Webhooks → email or Slack on function failure).
- [ ] Concurrency: limit `wa.message.received` per `conversation_id` to 1 so bot turns never interleave.

## 5. Environment variables checklist (Production)

Validated at boot with zod (CLAUDE.md §10): a missing or malformed value must fail the deploy, not run.

| Variable | Source | Secret | Rotation |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API | No | Never |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API | No (public, RLS-protected) | On compromise |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | **Yes** — server only | On compromise / staff exit |
| `META_APP_ID` | Meta app dashboard | No | Never |
| `META_APP_SECRET` | Meta app → Settings → Basic | **Yes** | Yearly / on compromise |
| `META_VERIFY_TOKEN` | You generate (`openssl rand -hex 32`) | **Yes** | On compromise |
| `META_PAGE_ID` | Facebook Page → About | No | Never |
| `META_PAGE_ACCESS_TOKEN` | Long-lived page token via System User | **Yes** | On compromise / permission change |
| `META_GRAPH_VERSION` | Meta changelog (e.g. `vNN.0`) | No | When Meta deprecates the version |
| `WA_PHONE_NUMBER_ID` | WhatsApp Manager → API setup | No | Never |
| `WA_BUSINESS_ACCOUNT_ID` | WhatsApp Manager | No | Never |
| `WA_ACCESS_TOKEN` | Business Settings → System User → Generate token (never expires) | **Yes** | Yearly / on compromise |
| `WA_VERIFY_TOKEN` | You generate | **Yes** | On compromise |
| `AI_PROVIDER` | `anthropic` or `gemini` | No | — |
| `ANTHROPIC_API_KEY` | Anthropic Console (paid API tier) | **Yes** | Every 90 days |
| `GEMINI_API_KEY` | Google AI Studio / Vertex **paid** tier | **Yes** | Every 90 days |
| `INNGEST_EVENT_KEY` | Inngest → Production → Event keys | **Yes** | On compromise |
| `INNGEST_SIGNING_KEY` | Inngest → Production → Signing key | **Yes** | Use Inngest's rotation flow |
| `SENTRY_DSN` | Sentry → Project → Client Keys | No (public by design) | On abuse |
| `APP_BASE_URL` | `https://crm.<yourdomain>.in` | No | — |

Also needed for production but not in CLAUDE.md §11 — add to `.env.example` in phase 1:
`SENTRY_AUTH_TOKEN` (build-time source-map upload, secret), `SENTRY_ORG`, `SENTRY_PROJECT`, and
`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` if Upstash is chosen for rate limiting.

Checks before go-live:
- [ ] No `NEXT_PUBLIC_` prefix on any secret.
- [ ] Preview environment uses **dev** Supabase/WhatsApp/Meta values, never production.
- [ ] `vercel env ls production` shows every variable above.
- [ ] `GET /api/health` on the production URL returns `200` with env validation `ok`.

## 6. Sentry alerts

- [ ] Create project `healthconnectcrm` (platform Next.js); data region **EU or US** — note in the privacy
      policy that error data leaves India, and scrub PII (below).
- [ ] `beforeSend` scrubs phone numbers, names, message bodies and Aadhaar-looking digits; turn on
      Sentry server-side data scrubbing as a second layer. Session Replay **off** (screens show patient data).
- [ ] Release tracking: upload source maps on build; tag release with the git SHA.
- [ ] Alert rules (Alerts → Create):
  | Alert | Condition | Notify |
  |---|---|---|
  | Webhook errors | any error in `/api/webhooks/*`, > 5 in 5 min | Email + phone (on-call) |
  | New issue in production | first seen | Email |
  | Error spike | > 50 events / 15 min across project | Email + phone |
  | Slow webhooks | p95 transaction duration of `/api/webhooks/*` > 2 s for 10 min | Email |
  | Bot failures | issues tagged `component:bot` > 10 / 30 min | Email |
  | Cron/backfill missed | Sentry Cron Monitor on the 15-min Meta backfill and nightly jobs | Email |
- [ ] Uptime monitor on `https://<domain>/api/health` every 1 min.

## 7. Meta + WhatsApp production wiring

Done after the domain is live (details in `docs/META_SETUP.md` / `docs/WHATSAPP_SETUP.md`, phases 4–5):
- [ ] Meta app → Webhooks → Page → callback `https://<domain>/api/webhooks/meta`, field `leadgen`.
- [ ] WhatsApp → Configuration → callback `https://<domain>/api/webhooks/whatsapp`, fields `messages`.
- [ ] Meta app switched to **Live** mode; business verified.
- [ ] All templates in §6.2 show **Approved** in WhatsApp Manager and in `wa_templates`.

## 8. Go-live gate

Do not send real patient traffic until all are true:
- [ ] Every item of the Definition of Done passes in production (`docs/DOD_REPORT.md`).
- [ ] PITR enabled and a restore tested.
- [ ] Privacy policy, terms and grievance officer contact live.
- [ ] Hospital MoUs signed; lawyer review of consent text done (CLAUDE.md Part C).
- [ ] On-call person named and has read `docs/RUNBOOK.md`.
