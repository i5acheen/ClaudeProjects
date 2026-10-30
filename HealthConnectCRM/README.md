# HealthConnectCRM

Patient Lead CRM for a patient coordination service in Chhatrapati Sambhajinagar, Maharashtra —
Meta Lead Ads + WhatsApp Cloud API + AI bot ("Sahayak") to help patients access MJPJAY / PM-JAY treatment.

- **Spec and build guide:** [`CLAUDE.md`](CLAUDE.md) — run the Part B phase prompts in order.
- **Production setup:** [`docs/PRODUCTION.md`](docs/PRODUCTION.md) (Vercel `bom1`, Supabase `ap-south-1`, Inngest, Sentry, domain, env checklist)
- **Operations:** [`docs/RUNBOOK.md`](docs/RUNBOOK.md)
- **Definition of Done status:** [`docs/DOD_REPORT.md`](docs/DOD_REPORT.md)

Status: specification + production docs only. Application code (phases 1–8) not yet built.

Secrets live only in `.env.local` (dev) and Vercel environment variables (prod). See `.env.example`.
