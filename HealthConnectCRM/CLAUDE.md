# HealthConnectCRM — Patient Lead CRM — Claude Code Build Guide (Enterprise Grade)

This file is the complete brief for building the Patient Lead CRM with Claude Code.

**How to use it**
1. Create an empty folder, e.g. `patient-crm`, and open it in Claude Code.
2. Save this file in that folder as `CLAUDE.md` (Claude Code reads it automatically every session).
3. Run the phase prompts in **Part B** one at a time, in order. Do not start a phase until the previous one passes its checks.
4. Keep secrets only in `.env.local` and in Vercel environment variables. Never paste real tokens into chat or commit them.

---

# PART A — Project specification (this is the CLAUDE.md content)

## 1. What we are building

A CRM for a patient coordination service in Chhatrapati Sambhajinagar, Maharashtra. The service finds patients through Meta ads and WhatsApp, and helps them get free treatment at empanelled hospitals under government schemes:
- **MJPJAY** — Mahatma Jyotiba Phule Jan Arogya Yojana (Maharashtra)
- **PM-JAY** — Ayushman Bharat

Initial treatments: **varicose veins, spine surgery, thyroid**. The service ends when the patient is **admitted**.

The CRM must:
1. Receive leads automatically from **Meta Lead Ads** (Facebook + Instagram instant forms).
2. Send an approved **WhatsApp template** greeting to every new lead within seconds.
3. Run an **AI WhatsApp bot** that converses with patients in Marathi / Hindi / English, collects details, requests documents, and hands over to a human coordinator.
4. Store **every message, document, stage change and action** against the patient.
5. Give coordinators a **pipeline, inbox, patient profile and dashboard**, and give partner hospitals a limited portal.
6. Meet Indian health-data expectations (DPDP Act 2023): consent, minimum data, access control, audit trail, deletion on request, India-region hosting.

## 2. Pipeline stages (fixed, in this order)

| # | Stage | Meaning | Who moves it |
|---|-------|---------|--------------|
| 0 | New | Lead arrived, greeting sent | System |
| 1 | Contacted | Patient replied or call connected | Bot / coordinator |
| 2 | Docs pending | Documents requested | Bot / coordinator |
| 3 | Eligible | Documents received, scheme eligibility confirmed | Coordinator (bot may propose) |
| 4 | Referred | Visit booked at an empanelled hospital | Coordinator |
| 5 | Admitted | Patient admitted — case closed | Coordinator / hospital partner |
| — | Lost | Not eligible, not reachable, not interested (with reason) | Coordinator |

Rules: the bot may move a lead forward only up to **Eligible (3)**, and only forward. Every stage change writes a `stage_events` row with actor and reason.

## 3. Tech stack (use exactly this unless told otherwise)

> **Amendment 2026-11-02 (owner request: open-source and free where possible).** Deploy self-hosted on one
> Indian VM with Docker Compose: self-hosted Supabase, self-hosted Inngest, GlitchTip (Sentry SDK), Caddy and
> encrypted backups — see `docs/SELF_HOSTING.md` and `docs/DECISIONS.md` ADR-001. Vercel and Supabase Cloud below
> remain supported alternatives. AI may also use `AI_PROVIDER=openai_compat` for a self-hosted open-weight model.

- **App**: Next.js 15 (App Router) + TypeScript (strict) + React Server Components
- **UI**: Tailwind CSS + shadcn/ui; lucide-react icons; Recharts for charts
- **Database / Auth / Files**: Supabase — Postgres, Supabase Auth (email OTP + Google), Storage for documents. Create the project in the **Mumbai (ap-south-1)** region.
- **Data access**: Supabase JS client with generated types; SQL migrations in `supabase/migrations`; **Row Level Security on every table**
- **Validation**: zod for every request body, webhook payload, env var and AI output
- **Background jobs**: Inngest (durable steps, retries, scheduling). Webhooks must only store + enqueue, never do slow work inline.
- **AI**: provider-agnostic `lib/ai/` interface with two adapters — Anthropic Claude API and Google Gemini API. Choose via `AI_PROVIDER` env var. **Use a paid/API tier whose terms say customer data is not used for training** — patient data must not go to a free tier that may use content to improve models.
- **Hosting**: Vercel, functions region `bom1` (Mumbai)
- **Monitoring**: Sentry (errors + performance), structured JSON logs with request IDs
- **Testing**: Vitest (unit), Playwright (end-to-end), MSW to mock Meta and WhatsApp APIs
- **Quality**: ESLint, Prettier, `tsc --noEmit`, GitHub Actions CI on every PR
- **i18n**: UI in English and Marathi (next-intl); patient-facing text in Marathi/Hindi/English

## 4. Architecture

```
Meta Lead Ad form ──► /api/webhooks/meta ──► store raw event ──► Inngest: lead.received
                                                                  │
WhatsApp Cloud API ─► /api/webhooks/whatsapp ─► store raw event ─► Inngest: wa.message.received / wa.status
                                                                  │
                             ┌────────────────────────────────────┘
                             ▼
                 Workers (Inngest functions)
                 • fetch lead details from Graph API, upsert patient + lead
                 • send greeting template
                 • run AI bot turn → send reply → update lead
                 • download media → Storage
                 • SLA timers, follow-up reminders, nightly cleanup
                             │
                             ▼
                 Supabase Postgres (RLS)  ◄──►  Next.js app (coordinators, admin, hospital portal)
```

Principles:
- **Webhook endpoints**: verify signature → validate → insert into `webhook_events` (unique on provider event id) → enqueue → return `200` within 2 seconds.
- **Idempotency** everywhere: unique keys on `meta_leadgen_id`, `wa_message_id`; job steps safe to retry.
- **Outbound sends** go through one `lib/whatsapp/send.ts` that enforces the 24-hour window, opt-out, rate limits and logs every attempt.
- **Server-only secrets**: tokens are never sent to the browser. Use the Supabase service role only inside server code and jobs.

## 5. Data model (Postgres)

Create these tables with migrations. Use `uuid` primary keys (`gen_random_uuid()`), `timestamptz` for times, `created_at`/`updated_at` on every table, and an `org_id` on every business table (multi-tenant ready, even if we start with one organisation).

- `orgs` — id, name, settings jsonb
- `profiles` — user_id (auth.users), org_id, full_name, role (`admin` | `coordinator` | `hospital_partner` | `viewer`), hospital_id nullable, is_active
- `hospitals` — id, org_id, name, address, district, empanelled_schemes text[], specialties text[], contact_name, contact_phone, is_active
- `campaigns` — id, org_id, meta_campaign_id, meta_adset_id, meta_ad_id, name, treatment, language
- `patients` — id, org_id, full_name, phone_e164 (unique per org), age, gender, district, taluka, preferred_language (`mr` | `hi` | `en`), consent_whatsapp bool, consent_at, consent_source, opted_out_at, deleted_at
- `leads` — id, org_id, patient_id, source (`meta_lead_ad` | `whatsapp` | `website` | `referral` | `manual`), campaign_id, meta_leadgen_id (unique), meta_form_id, treatment, scheme (`MJPJAY` | `PM-JAY` | `unknown`), stage smallint, lost_reason, assigned_to (user), hospital_id, bot_enabled bool default true, needs_human bool default false, last_inbound_at, last_outbound_at, next_action_at, admitted_at
- `lead_facts` — lead_id, key (`problem` | `since` | `age` | `district` | `aadhaar` | `ration_card` | `scheme_card` …), value, source (`bot` | `coordinator` | `form`), confidence, updated_at — one row per key
- `conversations` — id, org_id, patient_id, wa_phone_number_id, window_expires_at (last inbound + 24h), status (`open` | `closed`)
- `messages` — id, conversation_id, lead_id, direction (`in` | `out`), sender (`patient` | `bot` | `coordinator` | `system`), sender_user_id, type (`text` | `template` | `image` | `document` | `audio` | `interactive`), body, template_name, media_id → `documents`, wa_message_id (unique), status (`queued` | `sent` | `delivered` | `read` | `failed`), error_code, created_at
- `documents` — id, org_id, patient_id, lead_id, kind (`aadhaar` | `ration_card` | `scheme_card` | `prescription` | `report` | `other`), storage_path, mime_type, size_bytes, verified_by, verified_at — Storage bucket **private**, access only via short-lived signed URLs
- `stage_events` — id, lead_id, from_stage, to_stage, actor_type (`system` | `bot` | `user`), actor_user_id, reason, created_at
- `tasks` — id, lead_id, assigned_to, type (`call` | `chase_docs` | `book_visit` | `confirm_admission`), due_at, done_at
- `notes` — id, lead_id, author_id, body
- `wa_templates` — name, language, category (`utility` | `marketing` | `authentication`), status, body_preview, variables
- `bot_runs` — id, lead_id, input_message_id, model, prompt_version, latency_ms, input_tokens, output_tokens, output jsonb, guardrail_flags text[], error
- `webhook_events` — id, provider (`meta` | `whatsapp`), event_key (unique), payload jsonb, received_at, processed_at, error
- `audit_log` — id, org_id, actor_user_id, action, entity, entity_id, before jsonb, after jsonb, ip, user_agent, created_at — **append-only** (no update/delete grants)
- `consents` — id, patient_id, purpose, granted bool, text_shown, source, created_at

Indexes: leads(org_id, stage, updated_at desc), leads(assigned_to), messages(conversation_id, created_at), patients(org_id, phone_e164), webhook_events(event_key).

Views / functions:
- `v_funnel` (counts reaching each stage by period, source, campaign, treatment)
- `v_campaign_performance` (leads, contacted, eligible, admitted, rate per campaign)
- `move_lead_stage(lead_id, to_stage, reason)` — security definer function that validates the move, updates the lead and inserts `stage_events` + `audit_log` in one transaction

### Row Level Security
- Every table: users see only rows where `org_id` = their org.
- `coordinator`: read/write leads, patients, messages, documents in their org.
- `hospital_partner`: read-only access to leads where `hospital_id` = their hospital **and** stage ≥ Referred; can update stage to Admitted with admission date; no access to other patients, raw messages, or Aadhaar documents.
- `viewer`: read-only dashboard aggregates; no personal data.
- `admin`: everything in their org, plus settings, users and templates.
- Write RLS tests (pgTAP or Vitest against a local Supabase) that prove a hospital partner cannot read another hospital's patients.

## 6. Integrations

### 6.1 Meta Lead Ads
- Meta app (type Business) with the **Webhooks** product; subscribe the Facebook Page to the `leadgen` field.
- `GET /api/webhooks/meta`: answer the verification challenge with `META_VERIFY_TOKEN`.
- `POST /api/webhooks/meta`: verify `X-Hub-Signature-256` (HMAC-SHA256 of raw body with `META_APP_SECRET`, constant-time compare) → store → enqueue `lead.received`.
- Worker: fetch the lead from the Graph API (`/{leadgen_id}`) with a long-lived Page access token, map form fields → patient + lead, attach campaign / ad set / ad IDs, upsert by `meta_leadgen_id`.
- Field mapping is configurable in Settings (form question → CRM field) so new forms don't need code changes.
- **Backfill job**: every 15 minutes, pull recent leads per form from the Graph API and insert any the webhook missed.
- Required form elements: name, phone, district/taluka, treatment, “Do you have an Ayushman/MJPJAY card?”, and a **consent checkbox** for WhatsApp contact plus a link to the privacy policy.
- Optional (phase 7): send `Lead` / `Purchase`-style conversion events back via the **Conversions API** when a lead becomes Eligible / Admitted, so Meta optimises for real patients. Hash phone numbers (SHA-256) before sending; never send health details.

### 6.2 WhatsApp Cloud API
- Use the official Meta **WhatsApp Cloud API** directly (no paid BSP required). Store `WA_PHONE_NUMBER_ID`, `WA_BUSINESS_ACCOUNT_ID`, and a **System User permanent token**.
- If the business number is currently on the WhatsApp Business app, check Meta's **coexistence** onboarding (keeps the app and the API on one number); otherwise use a new dedicated number.
- `GET /api/webhooks/whatsapp`: verification challenge. `POST`: verify signature → store → enqueue. Handle `messages` (text, image, document, audio, interactive replies, button replies) and `statuses` (sent / delivered / read / failed).
- **24-hour rule**: free-form messages only within 24 hours of the patient's last message. Outside the window, only approved templates. `send.ts` must check `conversations.window_expires_at` and refuse otherwise.
- **Templates** (create in WhatsApp Manager, sync status into `wa_templates` nightly):
  - `lead_greeting_mr`, `lead_greeting_hi` (utility) — first message after a Meta lead
  - `docs_reminder_mr` / `_hi` (utility) — reminder to send documents
  - `visit_confirmation_mr` / `_hi` (utility) — hospital name, date, time
  - `reengage_mr` (marketing) — only for consented patients, rarely
- **Media**: download inbound media via the media ID, store in the private bucket, link to `documents`; the bot classifies the image kind (Aadhaar / ration / scheme card) but a human verifies.
- **Opt-out**: words like STOP, थांबवा, बंद करा, बंद करो → set `opted_out_at`, confirm once, never message again.
- Mark inbound messages as read when the bot or a coordinator replies; show “typing” indicator if the API supports it.
- Pricing note for the admin screen: Meta charges per delivered template message by category; replies inside the 24-hour customer service window are not charged. Show monthly template counts by category on the dashboard.

## 7. AI WhatsApp bot

### Behaviour
- Persona “Sahayak”, the assistant of the coordination service. Warm, respectful (“जी”), 2–4 short sentences, one question at a time, no markdown.
- Language: reply in the patient's language; default Marathi; store detected language on the patient.
- Collect, in order: problem + duration → age → taluka/district → has Aadhaar → has ration card (colour) → has Ayushman/MJPJAY card → request photos of documents.
- Answer common questions from a curated **FAQ knowledge base** (`kb_articles` table, editable by admin): what the scheme covers, which documents are needed, how the process works, that the service is free.

### Hard guardrails (enforced in code, not only in the prompt)
- Never diagnose, never suggest medicines, never interpret reports, never promise free treatment — eligibility is confirmed by the scheme/hospital.
- Emergency words (chest pain, unconscious, bleeding, छातीत दुखणे, बेशुद्ध …) → immediate fixed reply: go to the nearest hospital or call **108**; set `needs_human = true`; alert coordinators.
- Handover to a human when: patient asks for a person, is angry, asks medical questions, asks about money outside the scheme, sends an unclear document, bot confidence is low, or after 3 bot turns without progress.
- When `needs_human = true` or `bot_enabled = false`, the bot never replies.
- Output must be **JSON validated with zod**:
  ```json
  {"reply": "string", "language": "mr|hi|en", "proposed_stage": 0, "handover": false,
   "handover_reason": "", "facts": {"problem": "", "since": "", "age": "", "district": "",
   "aadhaar": "", "ration_card": "", "scheme_card": ""}, "confidence": 0.0}
  ```
  Invalid output → retry once with a repair prompt → otherwise send a safe fallback (“आमचे समन्वयक लवकरच आपल्याला फोन करतील.”) and hand over.
- Post-generation checks: block replies containing medicine names, dosages, prices, or guarantee phrases; replace with fallback + handover; record in `bot_runs.guardrail_flags`.
- Send only the last ~16 messages + known facts to the model; never send Aadhaar numbers or document images' text to the model. Mask numbers in prompts.
- Prompts are versioned files in `lib/ai/prompts/` with a `PROMPT_VERSION`; every run is logged in `bot_runs`.

### Evaluation
- `tests/bot-evals/` — at least 40 scripted conversations (Marathi, Hindi, English, mixed/Hinglish, emergencies, abusive messages, medical questions, document photos, opt-out). A script runs them against the live model and checks: valid JSON, correct language, no guardrail violations, correct handover. Run before changing any prompt.

## 8. Application screens

All screens responsive (coordinators use phones), English + Marathi UI, keyboard accessible, WCAG 2.1 AA contrast.

1. **Login** — email OTP / Google; inactive users blocked.
2. **Dashboard** — KPIs (new today, uncontacted > 15 min, waiting for human, eligible, referred, admitted this month, lead→admission %), funnel, source & campaign performance, treatment split, coordinator leaderboard, response-time chart. Filters: date range, campaign, treatment, coordinator.
3. **Pipeline** — Kanban by stage with drag-and-drop (calls `move_lead_stage`), filters, saved views, bulk assign, and a table view with export.
4. **Inbox** — conversation list (filters: needs human, unread, my leads, bot active), thread with all message types and delivery ticks, composer with quick replies, template picker (forced when window closed), bot on/off toggle, “take over” button, internal notes that patients never see.
5. **Patient / lead profile** — details, consent record, facts collected, document gallery with verify buttons, stage timeline, tasks, notes, hospital assignment, full audit history.
6. **Tasks** — my tasks today/overdue; auto-created by stage (e.g. Docs pending → chase in 24 h).
7. **Hospitals** — list, schemes, specialties, contacts.
8. **Hospital partner portal** — only referred patients for their hospital: name, treatment, visit date; button “Mark admitted” with date.
9. **Settings (admin)** — users & roles, Meta pages/forms + field mapping, WhatsApp number & templates, bot settings (on/off globally, working hours, FAQ articles, prompt version), stage SLAs, data retention.
10. **Privacy tools (admin)** — search patient → export their data (JSON/PDF) or delete/anonymise; every action audited.

Real-time: inbox and pipeline update live via Supabase Realtime.

## 9. Automation rules (Inngest)

- New lead → greeting template immediately → if no reply in 2 h (and before 8 pm), notify coordinator to call → if no reply in 24 h, `docs_reminder` template once.
- Docs pending for 24 h → reminder template; 72 h → coordinator task.
- Needs human → notify assigned coordinator (in-app + optional email/WhatsApp to staff), escalate to admin after 30 min unanswered.
- Lead assignment: round-robin among active coordinators, respecting working hours; manual override.
- Quiet hours: no outbound patient messages 9 pm–8 am IST (queue them).
- Nightly: sync template statuses, backfill Meta leads, purge raw `webhook_events` older than 30 days, archive admitted leads after the retention period.

## 10. Security & compliance (non-negotiable)

- RLS on all tables; tests prove isolation between orgs, roles and hospitals.
- Verify every webhook signature; reject replays older than 5 minutes where timestamps exist.
- Secrets only in env vars; validated at boot with zod; never logged.
- Phone numbers masked in lists (`+91 98XXX XX214`); full number visible on profile to coordinators only.
- Aadhaar: do **not** store the Aadhaar number as text; store only the photo in the private bucket, auto-delete Aadhaar images after admission + retention period. Signed URLs expire in 60 seconds.
- Audit log every read of a document, every export, every stage change, every role change.
- Consent captured on every lead (form checkbox text stored verbatim in `consents`); opt-out honoured everywhere.
- Rate limiting on all public endpoints (Upstash Ratelimit or Vercel firewall rules).
- Security headers (CSP, HSTS, X-Frame-Options, Referrer-Policy); CSRF protection on mutations; session timeout 12 h.
- Data retention setting (default: delete documents 90 days after admission/lost; anonymise patient 1 year after).
- Privacy policy + terms pages (required by Meta for lead forms and WhatsApp); grievance officer contact.
- Daily database backups (Supabase PITR on a paid plan before going live with real patients).
- Dependency scanning (npm audit / Dependabot) in CI.

## 11. Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=            # random string you choose
META_PAGE_ID=
META_PAGE_ACCESS_TOKEN=       # long-lived page token
META_GRAPH_VERSION=           # current Graph API version from Meta docs
WA_PHONE_NUMBER_ID=
WA_BUSINESS_ACCOUNT_ID=
WA_ACCESS_TOKEN=              # System User permanent token
WA_VERIFY_TOKEN=
AI_PROVIDER=anthropic         # or gemini
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
INNGEST_EVENT_KEY=
INNGEST_SIGNING_KEY=
SENTRY_DSN=
APP_BASE_URL=
```

## 12. Coding standards

- TypeScript strict; no `any`; zod schemas are the source of truth for types at boundaries.
- Folder layout: `app/(dashboard)/…`, `app/api/webhooks/{meta,whatsapp}/route.ts`, `lib/{meta,whatsapp,ai,db,auth,audit}/`, `inngest/functions/`, `supabase/migrations/`, `tests/{unit,e2e,bot-evals}/`.
- Server actions or route handlers check the user's role on the server every time; never trust client role.
- Every external call has a timeout, retry with backoff (in jobs), and structured error logging.
- Small, reviewed commits; conventional commit messages; update `README.md` and `docs/` as you go.
- Do not add a dependency without a reason in the PR description.
- Never commit `.env*` files; add a `.env.example`.

## 13. Definition of done (for the whole app)

- A test Meta lead (Meta's Lead Ads Testing Tool) appears in the CRM in under 10 seconds, with the greeting delivered on WhatsApp.
- Replying on WhatsApp gets a correct Marathi bot reply in under 10 seconds; facts and stage update; documents land in the profile.
- “Talk to a person” triggers handover and a coordinator alert; the bot stays silent afterwards.
- Hospital partner sees only their referred patients and can mark admission.
- Dashboard numbers match database counts; campaign table shows admissions per ad.
- CI green: lint, types, unit, e2e, RLS tests, bot evals ≥ 95% pass.
- Privacy export and deletion work and are audited.

---

# PART B — Phase prompts to paste into Claude Code

Paste one prompt at a time. After each phase, ask Claude Code to run the checks and show you what changed.

### Phase 0 — Plan
```
Read CLAUDE.md fully. Do not write code yet. Produce docs/PLAN.md with: the folder structure, the list of migrations, the list of API routes and Inngest functions, and any questions or risks you see. Then wait for my approval.
```

### Phase 1 — Foundation
```
Set up the project per CLAUDE.md section 3: Next.js 15 + TypeScript strict, Tailwind, shadcn/ui, next-intl (en, mr), ESLint/Prettier, Vitest, Playwright, Sentry, zod env validation, GitHub Actions CI (lint, typecheck, test). Add .env.example with every variable from section 11. Add a health check route. Run lint, typecheck and tests and show me the output.
```

### Phase 2 — Database, auth and roles
```
Create the Supabase migrations for every table, index, view and function in CLAUDE.md section 5, with RLS policies for admin, coordinator, hospital_partner and viewer. Add Supabase Auth (email OTP + Google), a profiles table trigger, role-based route protection, and an admin Users screen. Write RLS tests proving: org isolation, hospital partners only see their referred patients, viewers see no personal data. Generate TypeScript types. Run all tests.
```

### Phase 3 — Core CRM screens
```
Build the Dashboard, Pipeline (Kanban with drag-and-drop using move_lead_stage, plus table view), Patient/Lead profile, Tasks, Hospitals and Settings screens from CLAUDE.md section 8, using seed data from a seed script (clearly marked sample patients). Mobile responsive, English + Marathi UI, accessible. Add Supabase Realtime to pipeline. Add Playwright tests for: create lead manually, move stage, add note, assign hospital.
```

### Phase 4 — Meta Lead Ads integration
```
Implement CLAUDE.md section 6.1: GET/POST /api/webhooks/meta with signature verification, webhook_events storage, Inngest lead.received worker that fetches the lead from the Graph API, configurable field mapping in Settings, campaign linking, idempotent upsert, and the 15-minute backfill job. Mock Meta with MSW in tests (valid signature, bad signature, duplicate event, missing fields). Write docs/META_SETUP.md with exact click-by-click steps for me to create the Meta app, subscribe the page to leadgen, get a long-lived page token, and test with the Lead Ads Testing Tool.
```

### Phase 5 — WhatsApp Cloud API + shared inbox
```
Implement CLAUDE.md section 6.2: GET/POST /api/webhooks/whatsapp with signature verification, inbound messages of all types, status updates, media download to the private bucket, lib/whatsapp/send.ts enforcing the 24-hour window, opt-out, quiet hours and logging. Greeting template sent automatically on new Meta leads. Build the Inbox screen (section 8.4) with realtime updates, template picker when the window is closed, take-over and bot toggle. Tests with MSW. Write docs/WHATSAPP_SETUP.md: creating the WhatsApp Business Account, adding the number (including the coexistence option for an existing Business app number), System User token, webhook subscription, and submitting the templates listed in 6.2 with sample Marathi/Hindi text.
```

### Phase 6 — AI bot
```
Implement CLAUDE.md section 7: provider-agnostic lib/ai with Anthropic and Gemini adapters, versioned Sahayak prompt, zod-validated JSON output with one repair retry, code-level guardrails (emergency, medical, price, guarantee checks), handover logic, FAQ knowledge base table + admin editor, fact extraction into lead_facts, forward-only stage proposals capped at Eligible, bot_runs logging, and an Inngest wa.message.received worker that runs the bot only when bot_enabled and not needs_human. Create tests/bot-evals with 40 scripted conversations and a runner script; run it and show me the pass rate and every failure.
```

### Phase 7 — Automations, notifications, analytics
```
Implement CLAUDE.md section 9 automations in Inngest (follow-up timers, reminders, escalation, round-robin assignment, quiet hours, nightly jobs). Add in-app notifications and optional staff email. Complete the dashboard analytics (funnel, campaign performance with admissions, response times, coordinator leaderboard, monthly template counts by category). Add optional Meta Conversions API events for Eligible and Admitted with hashed phone only.
```

### Phase 8 — Security, privacy and hospital portal
```
Implement CLAUDE.md section 10 fully and the hospital partner portal (8.8) and privacy tools (8.10): masked phones, signed URLs, audit logging of document views/exports/stage and role changes, rate limiting, security headers, data retention jobs, consent records, opt-out, privacy policy and terms pages. Then do a security review of the whole codebase against OWASP Top 10 and list every finding with its fix.
```

### Phase 9 — Production readiness and deploy
```
Prepare for production: Vercel project in region bom1, environment variables checklist, Supabase production project in ap-south-1 with backups, Sentry alerts, Inngest production app, custom domain. Write docs/RUNBOOK.md (deploy, rollback, rotating tokens, what to do if webhooks stop, if WhatsApp quality rating drops, if the bot misbehaves — how to switch it off globally). Run the full Definition of Done from CLAUDE.md section 13 and report each item as pass/fail with evidence.
```

---

# PART C — Things only you can do (accounts and approvals)

1. **Meta Business Manager**: verify the business (needed for higher WhatsApp limits and some permissions).
2. **Meta developer app**: create it, add Webhooks + WhatsApp products; for permissions beyond your own assets, submit App Review.
3. **WhatsApp number**: decide coexistence with your current Business app number vs. a new dedicated number; set the display name (must match your brand/website).
4. **Templates**: submit the greeting, reminder and visit templates; approval usually takes minutes to a day.
5. **Privacy policy + website**: required for Meta lead forms and WhatsApp; host on your Vercel site.
6. **Supabase** (Mumbai region) and **Vercel** accounts; upgrade Supabase to a paid plan with backups before real patient data.
7. **AI API key** from a provider whose API terms exclude training on your data.
8. **Hospital agreements**: written MoU with each empanelled partner hospital before sharing any patient data with them.
9. **Legal check**: have a lawyer review consent text and data handling against the DPDP Act 2023 and any scheme rules on patient facilitation.
