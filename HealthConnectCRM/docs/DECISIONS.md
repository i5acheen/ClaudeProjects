# Architecture decisions

## ADR-001 — Open-source, self-hosted stack (2026-11-02)

**Context.** The owner asked to move to open-source and free technology wherever possible. The managed stack
(Vercel Pro, Supabase Pro + PITR, Inngest Pro, Sentry, Claude Opus) was estimated at ≈ $5,100–5,900/year
for ~1,000 leads/month, mostly fixed platform fees.

**Decision.** Primary deployment is one Linux VM in India (Oracle Cloud Always Free, Ampere A1) running Docker
Compose: self-hosted Supabase (unchanged schema, RLS and client code), self-hosted Inngest (unchanged job code),
GlitchTip instead of Sentry (unchanged SDK), Caddy for HTTPS, and age-encrypted pg_dump backups with an
off-site copy. The AI layer gains an OpenAI-compatible adapter so an open-weight model can be self-hosted;
the recommended default is the cheapest compliant paid API (Claude Haiku) until a self-hosted model passes
the bot evals within the latency target. Vercel/Supabase Cloud stay supported (`docs/PRODUCTION.md`).

**Why this shape.** Self-hosting the *same* components (Supabase, Inngest) kept the application code, the RLS
model and every test unchanged — a rewrite to other open-source tools (e.g. plain Postgres + pg-boss + Lucia)
would have cost weeks and re-opened security review for no saving.

**Consequences.**
- Cost ≈ $125–280/year (WhatsApp messages, domain, AI); infrastructure $0.
- The team now owns operations: updates, monitoring, backups, restore drills, incidents (~2 h/month).
- Backups: up to 6 h data loss (vs PITR seconds) until WAL archiving is added.
- Oracle Always Free has no SLA and capacity can be scarce; upgrade the account to Pay-As-You-Go (still free)
  to avoid idle reclamation. A small paid Indian VPS is the fallback.
- Inngest's server licence is SSPL (source-available, becomes Apache-2.0 after 3 years) — free to self-host
  for this use; it is the one non-OSI component.
- WhatsApp Cloud API and Meta Lead Ads have no open-source substitute.
