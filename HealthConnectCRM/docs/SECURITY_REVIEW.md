# Security review — OWASP Top 10 (2021)

Reviewed 2026-10-31 against the code in this repository (Phase 8). Status: **Fixed** = changed in code with a
test; **Open** = action needed before or soon after go-live; **Accepted** = known, low risk, documented.

| ID | OWASP | Finding | Severity | Status / fix |
|---|---|---|---|---|
| F1 | A01 Broken access control | Staff could insert patient-visible messages (e.g. `sender='bot'`) or edit message bodies through the Supabase API, falsifying the conversation record. | High | **Fixed** — `0006_hardening.sql`: users may only insert internal notes as themselves; message updates revoked. RLS tests "conversation integrity". |
| F2 | A01 | `documents.verified_by` could be set to another user. | Low | **Fixed** — trigger stamps `auth.uid()`; RLS test. |
| F3 | A09 Logging failures | Consent changes made by staff were not audited. | Medium | **Fixed** — `patient.consent_changed` audit trigger; RLS test. |
| F4 | A10 SSRF | Media download sends the WhatsApp token to whatever URL Meta's media endpoint returns. | Low | **Fixed** — https + Meta-host allow-list, 10 MB cap; MSW test. |
| F5 | A06 Vulnerable components | `npm audit`: 3 high (zod memory exhaustion on large collections — relevant to webhook validation; inngest via zod; postcss in Next). | High | **Fixed** — zod 4.6.7 (+ override for inngest), postcss override. Now 0 high, 5 moderate. CI fails on high. |
| F6 | A06 | Remaining moderate advisories in `next@15` and Sentry's build plugin (glob/minimatch); fixes need Next 16 / Sentry 10 downgrade. | Moderate | **Open** — build-time only for glob/minimatch; plan the Next 16 upgrade (CLAUDE.md pins 15). Dependabot enabled. |
| F7 | A05 Misconfiguration | CSP allows `'unsafe-inline'` scripts (App Router inline bootstrap). | Medium | **Open** — move to nonce-based CSP via middleware. Other headers (HSTS, XFO DENY, nosniff, Referrer-Policy, Permissions-Policy, frame-ancestors 'none') are set and e2e-tested. |
| F8 | A04 / A07 | No application-level rate limiting on public endpoints (`/api/webhooks/*`, `/login`). Supabase Auth rate-limits OTP sends itself. | Medium | **Open** — add Vercel Firewall rate-limit rules (docs/PRODUCTION.md §2) before launch; webhooks also verify signatures before doing any work, so floods cost one HMAC each. |
| F9 | A03 Injection / LLM | Prompt injection from patient messages. | Medium | **Accepted with controls** — model output is zod-validated; it can only produce a reply, facts and a stage proposal capped at Eligible in the DB function; post-generation guardrails block medicine/dose/price/guarantee/diagnosis; no tools; numbers masked before the model; images never sent. |
| F10 | A03 | Spreadsheet formula injection in CSV export. | Low | **Fixed** — values starting with `= + - @` are prefixed. |
| F11 | A01 | Coordinators can edit patient fields (incl. consent) directly via the API rather than only through the UI. | Low | **Accepted** — same org/role scope as the UI; consent edits now audited (F3). |
| F12 | A02 Crypto | Secrets only in env; validated at boot by name (values never logged); webhook HMAC-SHA256 with constant-time compare; verify-token compare also constant-time. | — | OK |
| F13 | A07 Auth | Invite-only (OTP `shouldCreateUser:false`, signups disabled), org/role in `app_metadata` (not user-editable), inactive users get no data (`auth_org_id()` requires `is_active`), 12 h hard session cap in middleware, admins cannot demote themselves. | — | OK |
| F14 | A08 Integrity | Webhooks: signature → unique `event_key` → enqueue (replays rejected by key). Inngest endpoint verifies `INNGEST_SIGNING_KEY` in production. | — | OK |
| F15 | A09 | Structured JSON logs redact phone-like numbers, names, bodies and secrets; Sentry `beforeSend` drops request bodies, cookies, user; `audit_log` is append-only even for the service role. | — | OK |
| F16 | A01 | Hospital partners: RLS limits them to their hospital at stage ≥ Referred; no messages/documents; admission only via `move_lead_stage` 4→5. Viewers: aggregates only. Proven by RLS tests. | — | OK |

## Not covered by this review
- Supabase dashboard settings (Auth rate limits, network restrictions, PITR) — checklist in docs/PRODUCTION.md.
- Penetration test and DPDP legal review — CLAUDE.md Part C.
