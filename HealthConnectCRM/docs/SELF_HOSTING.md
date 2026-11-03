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

## 1. Get the server (Oracle Cloud Always Free, India)

1. Create an Oracle Cloud account (Always Free) with home region **India West (Mumbai)** or **India South
   (Hyderabad)**: patient data must stay in India (DPDP). The home region cannot be changed later.
2. **Upgrade the account to Pay-As-You-Go** (still $0 within Always Free limits). Idle Always Free
   instances on free-only accounts can be reclaimed; a low-traffic CRM can look idle.
3. Compute → Create instance → Image **Ubuntu 24.04**, Shape **VM.Standard.A1.Flex, 4 OCPU / 24 GB**,
   boot volume 100–200 GB, add your SSH public key. If you see "out of host capacity", retry later or try
   the other region.
4. Networking → the instance's subnet → Security List → add ingress rules for **TCP 80 and 443** from
   `0.0.0.0/0` (22 is open by default; restrict it to your IP if you can).

## 2. Domain (optional)

No domain yet? The installer uses a free **sslip.io** name that points at your IP
(`crm.<ip-with-dashes>.sslip.io`), with a real HTTPS certificate. With your own domain, create three `A`
records pointing to the server: `crm.<yourdomain>`, `api.crm.<yourdomain>`, `errors.crm.<yourdomain>`.

## 3. Install: one command

Have ready: the admin's e-mail, and an SMTP login for sign-in codes. A Gmail account works: turn on 2-step
verification, then create an **App Password** at https://myaccount.google.com/apppasswords (Gmail allows
about 500 e-mails/day, plenty for staff logins).

SSH into the server and run:
```bash
curl -fsSL https://raw.githubusercontent.com/i5acheen/ClaudeProjects/claude/eager-dijkstra-rlhuad/HealthConnectCRM/deploy/bootstrap.sh | sudo bash
```
It asks about eight questions, then installs Docker and automatic security updates, opens ports 80/443 in
the OS firewall, downloads the CRM to `/opt/healthconnectcrm`, generates every secret, starts the stack,
applies the migrations, creates your admin and waits for HTTPS. First run: 10–20 minutes on the A1 VM.

At the end it prints **the backup private key once**. Save it in a password manager (and on paper). It is
not stored on the server, which keeps backups unreadable even if the server is stolen; without it,
backups cannot be restored.

Then open the printed CRM address and sign in with the e-mailed code. `<address>/api/health` must show
`"status":"ok"`. Meta and WhatsApp show as "not configured" until you fill `META_*` and `WA_*` in
`/opt/healthconnectcrm/HealthConnectCRM/deploy/supabase/crm.env` (`docs/META_SETUP.md`,
`docs/WHATSAPP_SETUP.md`) and run `docker compose up -d app` in that folder. The CRM works fully for manual
leads, calls, pipeline and team insights before then.

Re-running the command is safe: it keeps existing secrets and data.

<details><summary>Manual install (what the script does)</summary>

```bash
git clone --branch claude/eager-dijkstra-rlhuad https://github.com/i5acheen/ClaudeProjects.git && cd ClaudeProjects/HealthConnectCRM
```
```bash
cp deploy/site.env.example deploy/site.env && nano deploy/site.env
```
Fill hostnames, SMTP and the backup **public** key (make the pair with `age-keygen -o backup.agekey` on
your laptop and keep the private key offline). Then:
```bash
sh deploy/setup.sh && cd deploy/supabase && docker compose up -d --build
```
```bash
sh ../migrate.sh && sh ../create-admin.sh "Your organisation" you@yourdomain "Your Name"
```
</details>

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

- App: `sudo bash /opt/healthconnectcrm/HealthConnectCRM/deploy/update.sh` (takes a backup, pulls, keeps the
  previous image tagged `…-before-update` for rollback, rebuilds, migrates, checks health)
- Supabase: back up first, then follow `deploy/supabase/README.md` (`update.sh`); pin versions.
- Inngest / GlitchTip: set `INNGEST_VERSION` / `GLITCHTIP_VERSION` in `.env` to a tested tag rather than `latest`.
- OS: unattended-upgrades; reboot monthly in a quiet hour.

## Verified locally (2026-11-02)

The whole stack was run in a test environment (`SITE_SCHEME=http`, `*.localhost` hostnames, Mailpit as SMTP):

- All services healthy; only Caddy listens publicly. Studio and pg-meta return 404 through Caddy;
  anonymous REST reads of patient tables are refused by the database.
- Seven migrations apply on Supabase's Postgres 17 (private `documents` bucket and Realtime publication
  created, RLS on every table); re-running `migrate.sh` is a no-op.
- **Playwright 17/17** against the running stack, including real e-mailed 6-digit code login, lead creation,
  stage moves, notes, hospital assignment, hospital-partner isolation, dashboard counts vs the database,
  the global bot switch (audited), privacy export + anonymisation (audited), viewer restrictions.
- A correctly signed WhatsApp webhook flows through self-hosted Inngest: message stored, "talk to a person"
  handover (Marathi reply composed, lead flagged, coordinator alerted), and the bot stays silent afterwards;
  a bad signature gets 401. With the bot switched off, messages are stored and staff alerted with no bot reply.
- Encrypted backup produced (files start with the age header) and restored into a separate database with
  matching row counts.

Bugs found and fixed by this run (they would also have affected Supabase Cloud):
invited users got no CRM profile (migration 0007), the login e-mail contained a link instead of the code the
UI asks for (code template), and the backup job reported success while leaving unencrypted dumps when
encryption failed.

Not verifiable in that environment: Let's Encrypt certificates, real SMTP delivery, Meta/WhatsApp webhooks
from the internet, outbound WhatsApp sends, and Ollama latency on ARM hardware.

## Installer verified (2026-11-03)

`bootstrap.sh` was fetched from GitHub and run as a fresh install (`curl … | bash`, non-interactive answers,
`http` and `*.localhost` names, Mailpit as SMTP). Result: all 16 containers healthy, migrations 0001–0008
applied, organisation and admin created, `/api/health` → `ok` with Meta/WhatsApp "not configured", admin
signed in through the browser with the e-mailed code (Dashboard, Pipeline, Team, Settings load; no sample
data), and an encrypted backup produced.

The run found and fixed four installer bugs that only show on a brand-new server: migrations started before
Supabase Storage had created its tables; the installer's private file mode leaked onto Supabase's database
init scripts, so Postgres could not read them and service logins failed; `curl | bash` lost the rest of the
script after the first command that read input; and creating the first organisation put psql's status line
into the admin request.
