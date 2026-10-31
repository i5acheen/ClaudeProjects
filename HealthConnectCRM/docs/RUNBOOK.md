# Runbook — HealthConnectCRM

For whoever is on call. Each section: **symptoms → check → fix → verify**.
Production stack: Vercel (`bom1`) · Supabase (`ap-south-1`) · Inngest · Sentry · Meta Graph / WhatsApp Cloud API.
Setup details live in `docs/PRODUCTION.md`.

> Inngest function ids referenced below: `lead-received`, `wa-message-received`, `wa-status`,
> `lead-followups`, `docs-pending-followups`, `needs-human-escalation`, `meta-backfill`, `nightly-maintenance`.
> Keep this file in sync with the code when any of them change.

## 0. First five minutes of any incident

1. **Patient safety first.** If the bot is saying anything wrong, switch it off globally (§6.1) *before* debugging.
2. Open: Sentry (new issues), Vercel → Deployments (what changed and when), Inngest → Runs (failures), Supabase → Reports.
3. Note the start time in IST and post in the team channel: what you see, what you're doing.
4. If personal data may have leaked: stop, escalate to the admin/grievance officer — DPDP Act breach
   reporting obligations may apply (Data Protection Board + affected patients).

---

## 1. Deploy

Normal path — every deploy goes through a PR:
1. PR to `main`; CI must be green (lint, typecheck, unit, e2e, RLS tests). If the PR touches
   `lib/ai/prompts/` or bot logic, bot evals must be ≥ 95 %.
2. Database migrations **first**, and only backward-compatible ones (add columns/tables; never
   drop or rename in the same release as the code that stops using them):
   ```bash
   supabase link --project-ref <prod-ref>
   ```
   ```bash
   supabase db push
   ```
3. Merge → Vercel builds and deploys `main` to production automatically. Inngest re-syncs functions
   via the integration.
4. Verify (within 5 minutes):
   - `curl -fsS https://<domain>/api/health` returns `200`.
   - Inngest → Apps shows the new deploy's function list, no sync error.
   - Sentry → Releases: new release, no new issues.
   - Send a Lead Ads Testing Tool lead; it appears in the CRM and the greeting is delivered.

Avoid deploying 9 pm–8 am IST unless it is a fix (quiet hours mean you can't verify outbound messages).

## 2. Rollback

**Code** (fast, safe — no data change):
- Vercel → Project → Deployments → pick the last good production deployment → **Instant Rollback**
  (or `vercel rollback <deployment-url>`). Takes seconds; no rebuild.
- Re-sync Inngest if functions changed: Inngest → Apps → Resync (or redeploy).
- Note: Instant Rollback disables auto-promotion of new `main` builds until you promote again —
  fix forward with a revert PR, then promote it.

**Database:**
- Prefer a new forward migration that undoes the change.
- Data corruption: Supabase → Database → Backups → **Point-in-time recovery**, restore to a timestamp
  just before the incident. This replaces the whole database and loses all writes after that point
  (new leads, messages). Before restoring: switch the bot off, note the time, and plan to re-run the
  Meta backfill job afterwards to recover leads received since.

**Bad prompt** (bot behaving wrong after a prompt change): switch the bot off (§6.1). The prompt lives
in code (`lib/ai/prompts/sahayak.ts`, `PROMPT_VERSION`), so roll back with Vercel Instant Rollback or a
revert PR, run `npm run bot-evals` (≥ 95 %), then switch the bot on.

## 3. Rotating tokens and secrets

General procedure for every secret:
1. Create the new value at the provider (keep the old one valid if the provider allows two).
2. Vercel → Settings → Environment Variables → edit the **Production** value.
3. **Redeploy** (env changes only apply to new deployments): Deployments → latest → Redeploy.
4. Verify with `/api/health` and the specific check below.
5. Revoke the old value at the provider.
6. Record in the audit log / team channel: who, which secret, when. Never paste the value anywhere.

| Secret | Where to rotate | Verify |
|---|---|---|
| `WA_ACCESS_TOKEN` | Business Settings → Users → System users → Generate new token (permissions `whatsapp_business_messaging`, `whatsapp_business_management`); then revoke old | Send a test message from Inbox |
| `META_PAGE_ACCESS_TOKEN` | Same System User, generate a Page token with `leads_retrieval`, `pages_manage_metadata`, `pages_read_engagement` | Lead Ads Testing Tool lead arrives with full details |
| `META_APP_SECRET` | Meta app → Settings → Basic → Reset. **The old secret dies immediately** — webhook signatures fail until the redeploy is live, so do it in a quiet hour, then run the Meta backfill | New webhook passes signature check (no 401s in logs) |
| `META_VERIFY_TOKEN` / `WA_VERIFY_TOKEN` | Generate (`openssl rand -hex 32`), update Vercel, redeploy, then re-enter in Meta webhook config and click Verify | Meta shows verified |
| `SUPABASE_SERVICE_ROLE_KEY` / anon key | Supabase → Settings → API (JWT secret / API keys rotation). Rotating the JWT secret logs every user out | Login works; jobs run |
| `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` | Provider console → create new key → revoke old | Bot replies to a test number |
| `INNGEST_SIGNING_KEY` / `INNGEST_EVENT_KEY` | Inngest → Production → keys (use the signing-key rotation flow so both keys are valid during rollout) | Inngest Apps sync OK; test event runs |
| `SENTRY_DSN` | Sentry → Client Keys → new key, disable old | Test error appears |

Rotate immediately on: staff with access leaving, any secret seen in a log, chat, screenshot or commit.
If a secret was committed: rotate first, then clean history — rotation is what actually protects you.

## 4. Webhooks stopped (no new leads / no inbound WhatsApp)

**Symptoms:** dashboard "new today" flat during ad spend; Inbox silent; Sentry Cron alert on backfill;
`webhook_events` has no recent rows.

Check in this order:
1. **Is our endpoint up?** `curl -i https://<domain>/api/health`. Vercel → Logs filtered to `/api/webhooks`.
   - 5xx → recent deploy? Roll back (§2).
   - 401/403 → signature check failing → `META_APP_SECRET` mismatch (was it rotated?). Fix env, redeploy.
   - 429 → our own rate limit/firewall is blocking Meta. Allow Meta's IP ranges / raise the limit on webhook paths.
2. **Is Meta sending?**
   - Meta app → Webhooks: callback URL correct (custom domain, not an old preview URL), `leadgen` subscribed.
   - Lead Ads: Business Settings → Integrations → Leads Access — our app must be allowed for the Page;
     Graph API `GET /{page-id}/subscribed_apps` must list our app with `leadgen`.
   - WhatsApp: WhatsApp Manager → Configuration → webhook verified, `messages` field subscribed;
     `GET /{waba-id}/subscribed_apps` lists our app.
   - Meta disables a webhook after repeated failures — re-verify and re-subscribe.
   - Check https://metastatus.com for a Meta outage.
3. **Are events stored but not processed?** `select count(*) from webhook_events where processed_at is null and received_at > now() - interval '1 hour';`
   - Many unprocessed → Inngest problem: Inngest → Runs for failures; Apps → resync; check
     `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`. Replay failed runs from the Inngest dashboard (steps are idempotent).
4. **Token expired?** Graph API errors code `190` in logs → regenerate the System User token (§3).

**Recover missed data:**
- Leads: trigger the Meta backfill job manually from Inngest (it pulls recent leads per form; upsert on
  `meta_leadgen_id` makes duplicates impossible). Leads older than Meta's retention window must be
  downloaded from Meta Business Suite → Leads Center.
- WhatsApp messages: Meta does **not** redeliver after its retry window. Coordinators should check the
  WhatsApp number for missed conversations and message those patients by template.

**Verify:** Lead Ads Testing Tool lead appears in < 10 s; a WhatsApp from a test phone shows in Inbox.

## 5. WhatsApp quality rating drops

**Symptoms:** WhatsApp Manager → Phone numbers → Quality rating Yellow (Medium) or Red (Low); email from
Meta; messaging limit reduced; template status `PAUSED` or `DISABLED`; send errors such as `131049` / `131048`.

Why it happens: patients blocking or reporting us — usually too many templates, messages to people who
didn't expect them, or repeated messages.

Immediate actions:
1. **Stop marketing templates.** `update wa_templates set is_enabled = false where category = 'marketing';`
   (coordinators can then no longer pick them in the Inbox template picker; automations only send utility templates).
2. Check the last 7 days: `select template_name, count(*) from messages where type='template' and created_at > now()-interval '7 days' group by 1 order by 2 desc;` — look for a spike or a single template driving it.
3. Check who we messaged: were all leads consented (`patients.consent_whatsapp`) and not opted out? A bad
   form-field mapping can send greetings to people who did not tick consent — fix the mapping first.
4. Check the automation rules aren't double-sending (two greetings or reminders to the same lead → an
   idempotency bug; inspect `messages` for duplicates per lead per template).
5. Reduce volume: Inngest → Functions → pause `lead-followups` and `docs-pending-followups` for 48 h;
   let coordinators handle follow-ups by phone.
6. Improve the template that was flagged: clearer sender name, why we're messaging, how to stop
   ("STOP लिहा"). Resubmit as a new template name; update the mapping once Approved.
7. Paused templates come back automatically after the pause period if quality recovers; don't create
   lookalike templates to dodge a pause.

Monitor quality daily until Green for 7 days. Messaging limits recover gradually as quality stays high.

## 6. The bot misbehaves

Examples: medical advice, promising free treatment, wrong language, replying after handover, looping,
replying to opted-out patients.

### 6.1 Switch the bot off globally — do this first

Pick the fastest option that is available; any one is enough:

1. **App (normal):** Settings → Bot → untick **Bot replies enabled (all patients)** → Save (admin only).
   Stored in `orgs.settings.bot.enabled`; the `wa-message-received` worker checks it before every bot
   turn; the change is written to `audit_log` as `bot.global_disable`. Takes effect on the next message.
2. **SQL (if the app UI is down):** Supabase → SQL editor, as the service role:
   ```sql
   update orgs set settings = jsonb_set(coalesce(settings,'{}'::jsonb), '{bot,enabled}', 'false')
   where id = '<org-id>';
   insert into audit_log (org_id, action, entity, entity_id, after)
   values ('<org-id>', 'bot.global_disable', 'orgs', '<org-id>', '{"reason":"incident"}');
   ```
3. **Inngest (if the flag is somehow ignored):** Inngest → Production → Functions → `wa-message-received`
   → **Pause**. Caution: this function also files messages into the Inbox, so while paused new messages
   are only kept as raw payloads in `webhook_events` and do not appear in the Inbox. To recover: switch the
   bot off with option 1 or 2 **first**, then unpause — the queued runs drain, filing every message
   without any bot reply.
4. **Last resort:** in Vercel set `ANTHROPIC_API_KEY` (or `GEMINI_API_KEY`) to an invalid placeholder such
   as `disabled-incident` and redeploy. Do **not** delete the variable: env validation would then
   fail every server call that reads configuration — webhooks, jobs and the CRM — not just the bot. With an invalid key every bot turn fails and the code sends the safe fallback
   ("आमचे समन्वयक लवकरच आपल्याला फोन करतील.") and hands the patient to a human.

While the bot is off, new messages still land in the Inbox (unread) and the assigned coordinator — or all
staff when unassigned — gets an alert (🔔 / Alerts page). Tell coordinators the bot is off and that the
Inbox "Unread" and "Needs human" filters are now their queue.

### 6.2 Investigate

- `bot_runs` for the affected leads: `prompt_version`, `model`, `output`, `guardrail_flags`, `error`.
- Was it a prompt change (compare `prompt_version` with the last good one), a model/provider change
  (`AI_PROVIDER`, model id), or a guardrail gap (unblocked medicine name, price, guarantee phrase)?
- Did the bot reply when `needs_human` / `bot_enabled = false`? That is a code bug — severity high.

### 6.3 Fix and re-enable

1. Roll the prompt version back, or fix the guardrail / code.
2. Add the bad conversation to `tests/bot-evals/` so it never regresses.
3. Run bot evals; must be ≥ 95 % with **zero** guardrail violations on safety cases.
4. Re-enable (Settings → Bot → On / unpause Inngest), watch the next 20 bot turns live in Inbox.
5. Coordinators personally follow up with any patient who received a wrong message.

## 7. Other quick references

| Problem | First check |
|---|---|
| Users can't log in | Supabase Auth logs; Site URL / redirect URLs; Google OAuth client; user `is_active` |
| Documents won't open | Signed URL expiry (60 s by design — reopen); bucket policy; `documents.storage_path` |
| Outbound messages "failed" | `messages.error_code`: 131047 = 24 h window closed (use template); 131026 = number not on WhatsApp; 131049/131048 = quality/spam limits (§5) |
| Dashboard numbers look wrong | Compare `v_funnel` with `select stage, count(*) from leads group by stage`; check timezone (IST vs UTC) of date filters |
| Supabase near limits | Reports → database size, connections; nightly purge of `webhook_events` > 30 days ran? |

## 8. Contacts

Fill in before go-live:
- On-call: ______  Admin / grievance officer: ______
- Vercel team owner: ______  Supabase org owner: ______  Meta Business admin: ______
