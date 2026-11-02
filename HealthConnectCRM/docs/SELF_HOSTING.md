# Self-hosting on free / open-source infrastructure

Primary deployment target since 2026-11-02 (see `docs/DECISIONS.md` ADR-001). Everything runs on **one
Linux server in India** with Docker Compose. `docs/PRODUCTION.md` (Vercel + Supabase Cloud) remains the
managed alternative.

## What runs where

| Concern | Managed stack (before) | Self-hosted (now) | Licence |
|---|---|---|---|
| Server | Vercel (bom1) | One VM — Oracle Cloud **Always Free** Ampere A1 (4 cores, 24 GB) in Mumbai or Hyderabad | — |
| HTTPS / routing | Vercel | **Caddy** (automatic Let's Encrypt) | Apache-2.0 |
| App | Vercel functions | Same Next.js app, standalone Docker image (`Dockerfile`) | — |
| Database, Auth, Storage, Realtime | Supabase Cloud | **Supabase self-hosted** (official compose, pinned) — same migrations, RLS and client code | Apache-2.0 (+ PostgreSQL licence) |
| Background jobs | Inngest Cloud | **Inngest self-hosted** (`inngest start`, SQLite + embedded queue) — same code | SSPL, converts to Apache-2.0 after 3 years; free to self-host |
| Error tracking + uptime | Sentry | **GlitchTip** (accepts the Sentry SDK; built-in uptime monitors) | MIT |
| Backups | Supabase PITR ($100/mo) | `pg_dump` + document files every 6 h, **age**-encrypted, optional off-site copy with **rclone** | BSD / Apache-2.0 / MIT |
| AI bot | Claude Opus | Pluggable: Claude Haiku (cheapest compliant API), or an **open-weight model** you host (Ollama / vLLM / llama.cpp) via `AI_PROVIDER=openai_compat` | varies |
| WhatsApp, Meta Lead Ads | Meta Cloud API | unchanged — no open-source substitute for Meta's own APIs | — |

What could **not** be made free: WhatsApp template messages (Meta bills per message), a domain name, an SMTP
relay for login codes (free tiers are fine), and — realistically — the AI model (see "AI choices").

## Yearly cost (≈1,000 leads/month)

| Item | Cost / year |
|---|---|
| Oracle Always Free VM, 200 GB disk, 10 TB egress | $0 |
| Supabase, Inngest, GlitchTip, Caddy, backups (self-hosted) | $0 |
| Off-site backups: Oracle Object Storage Always Free (20 GB), in the *other* Indian region | $0 |
| SMTP for staff login codes (e.g. a provider's free tier, ~300 mails/day) | $0 |
| Domain (`.in`) | ~$10 |
| WhatsApp utility templates (₹0.115 + 18 % GST; ~3–13 per lead) | ~$55–210 |
| AI: Claude Haiku 5.5 (~10 bot turns/lead) | ~$60 |
| **Total** | **≈ $125–280 (₹11,000–25,000)** — down from ≈ $5,100–5,900 managed |

Prices are third-party figures as of Oct–Nov 2026; verify before budgeting.

**What you pay in time instead:** you now own OS and container updates, disk space, certificate renewals
(automatic), backups and restore drills, and incident response. Budget ~2 hours/month (RUNBOOK §8).

## AI choices (decide with the bot evals, not by price alone)

| Option | Cost/yr | Patient data leaves your server? | Reality check |
|---|---|---|---|
| **Claude Haiku 5.5** (`AI_PROVIDER=anthropic`, `AI_MODEL=claude-haiku-5-5`) | ~$60 | Yes, to a paid API whose terms exclude training | Recommended starting point. Run `npm run bot-evals` (≥ 95 %) before switching from the default model. |
| Open-weight model on the **same free VM** via Ollama (`AI_PROVIDER=openai_compat`) | $0 | No | CPU-only ARM: expect roughly 30–90 s per reply for an 8B model, so the 10-second target in CLAUDE.md §13 fails, and small open models are weak in Marathi. Only viable if you accept slow replies and the evals pass. |
| Open-weight model on a **GPU server** you rent | ≥ $1,000 | No | Fast and private, but not free. |
| **Bot off** (coordinators answer every WhatsApp by hand) | $0 | No | Fully free and safest; Settings → Bot → off. Greetings, reminders and the inbox still work. |

The bot's guardrails, JSON validation, fallback and handover apply identically to every provider.
Never use a free AI tier that may train on inputs (CLAUDE.md §3).

## 1. Get the server

1. Create an Oracle Cloud account (Always Free) with home region **India South (Hyderabad)** or **India West
   (Mumbai)** — patient data must stay in India (DPDP). The home region cannot be changed later.
2. **Upgrade the account to Pay-As-You-Go** (still $0 within Always Free limits). Idle Always Free
   instances on free-only accounts can be reclaimed; a low-traffic CRM can look idle.
3. Compute → Create instance → Image **Ubuntu 24.04**, Shape **VM.Standard.A1.Flex, 4 OCPU / 24 GB**,
   boot volume 100–200 GB. If you see "out of host capacity", retry later or try the other region.
4. Networking: allow inbound **TCP 80 and 443** only (plus 22 for SSH from your IP). Also open them in the
   OS firewall (`sudo iptables` / `ufw` — Oracle's Ubuntu image blocks them by default).
5. SSH in and install Docker Engine + Compose plugin (docs.docker.com/engine/install/ubuntu), Git, and
   enable automatic security updates (`sudo apt install unattended-upgrades`).

## 2. DNS

Create three `A` records pointing to the VM's public IP:
`crm.<yourdomain>` (the CRM), `api.crm.<yourdomain>` (Supabase APIs), `errors.crm.<yourdomain>` (GlitchTip).

## 3. Install

```bash
git clone https://github.com/i5acheen/HealthConnectCRM.git && cd HealthConnectCRM
```
```bash
cp deploy/site.env.example deploy/site.env && nano deploy/site.env
```
Fill hostnames, admin e-mail, SMTP, and the **backup public key**. Make the key pair on *your laptop*, not
the server, and keep the private key file offline (password manager + printed copy):
```bash
age-keygen -o backup.agekey
```
Then:
```bash
sh deploy/setup.sh
```
This pins and copies Supabase's official self-hosting files into `deploy/supabase/`, generates every
secret (database, JWT, API keys, Inngest, GlitchTip), and writes `deploy/supabase/crm.env`. Fill the Meta,
WhatsApp and AI values in that file (`docs/META_SETUP.md`, `docs/WHATSAPP_SETUP.md`). Then:
```bash
cd deploy/supabase && docker compose up -d --build
```
```bash
sh ../migrate.sh
```
```bash
sh ../create-admin.sh "Your organisation" you@yourdomain "Your Name"
```
Open `https://crm.<yourdomain>` and sign in with the e-mailed code. `https://crm.<yourdomain>/api/health`
must show `"status":"ok"`.

Only Caddy listens publicly (80/443). The database, Supabase Studio (`127.0.0.1:8000`) and the Inngest
dashboard (`127.0.0.1:8288`) are reachable only through an SSH tunnel:
```bash
ssh -L 8000:127.0.0.1:8000 -L 8288:127.0.0.1:8288 ubuntu@<server-ip>
```
Studio login: `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` from `deploy/supabase/.env`.

## 4. Error tracking and uptime (GlitchTip)

1. Create the first GlitchTip user: `docker compose exec errors ./manage.py createsuperuser`.
2. Sign in at `https://errors.crm.<yourdomain>` → create organisation and project (platform: JavaScript /
   Next.js) → copy the DSN into `SENTRY_DSN` (and `NEXT_PUBLIC_SENTRY_DSN` if you want browser errors) in
   `crm.env` → `docker compose up -d --build app`.
3. Uptime → add monitors for `https://crm.<yourdomain>/api/health` (expect 200) and the webhook URLs.
4. Alerts → e-mail on new issues. Patient data scrubbing in `lib/sentry-scrub.ts` applies unchanged.

## 5. Backups and the restore drill

The `backup` container dumps the whole database and the uploaded documents every 6 hours
(`BACKUP_INTERVAL_HOURS`), encrypts them with your **public** key, keeps 14 days locally
(`BACKUP_RETENTION_DAYS`) and, if `BACKUP_RCLONE_REMOTE` is set, copies them off-site. If encryption fails,
the unencrypted files are deleted and the run is logged as failed — plaintext patient data never stays on disk.

**Off-site copy:** an Oracle Object Storage bucket in the *other* Indian region (Always Free 20 GB, S3
compatible). Put an rclone S3 remote in `deploy/supabase/rclone.conf` and set
`BACKUP_RCLONE_REMOTE=<remote>:<bucket>` in `deploy/site.env`; re-run `setup.sh`, then
`docker compose up -d backup`.

**Restore drill (monthly, and before go-live):** copy the private key to the server temporarily, then:
```bash
docker compose run --rm -v /path/to/backup.agekey:/keys/backup.agekey:ro --entrypoint restore.sh backup /backups/<file>.dump.age /keys/backup.agekey restore_check
```
It restores into a separate `restore_check` database and prints row counts; compare with the live database,
then drop it and delete the key from the server. Verified on 2026-11-02: 6/6 leads and patients restored.

**Data-loss window:** up to 6 hours (vs seconds with Supabase PITR). Shorten `BACKUP_INTERVAL_HOURS`, or add
continuous WAL archiving (WAL-G / pgBackRest, open source) when patient volume justifies it.

## 6. Updates

- App: `git pull && cd deploy/supabase && docker compose up -d --build app && sh ../migrate.sh`
- Supabase: back up first, then follow `deploy/supabase/README.md` (`update.sh`); pin versions.
- Inngest / GlitchTip: set `INNGEST_VERSION` / `GLITCHTIP_VERSION` in `.env` to a tested tag rather than `latest`.
- OS: unattended-upgrades; reboot monthly in a quiet hour.

## Verified locally (2026-11-02)

The whole stack was brought up in a test environment with `SITE_SCHEME=http` and `*.localhost` hostnames:
all services healthy, six migrations applied on Supabase's Postgres 17 (private `documents` bucket and
Realtime publication created, RLS on every table), anonymous REST reads of patient data refused, Studio and
pg-meta not reachable through Caddy, `/api/health` ok, GlitchTip up, encrypted backup produced and restored.
Not verifiable there: Let's Encrypt certificates, real SMTP delivery, Meta/WhatsApp webhooks from the internet,
and Ollama latency on ARM hardware.
