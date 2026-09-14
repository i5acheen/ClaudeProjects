# ComplyTrail

A scoped-down SOC 2 evidence tracker for early-stage startups (5-50 people)
prepping for their first SOC 2 Type I audit — focused specifically on
**People Ops controls**: onboarding, offboarding, access reviews, background
checks, and security training. One framework, one domain, done properly,
rather than every framework done shallowly.

## What it does

- **Control checklist** — 10 pre-loaded SOC 2 People Ops controls, each with
  a status (Missing / In Progress / Evidence Attached) and an owner.
- **Evidence upload** — attach a file, a link, or a note to any control.
  Attaching evidence automatically moves the control to "Evidence Attached."
- **Gap report** — one view of every control with no evidence yet, alongside
  the company's audit date and how many days remain.
- **Policy drafting assistant** — for a control with no policy yet, answer a
  short questionnaire about how your company actually handles onboarding,
  offboarding, and training, and Claude drafts a first-pass policy you can
  edit and approve.
- **Simple auth** — one company/workspace, email+password. The first person
  to register creates the workspace and becomes admin; everyone after joins
  as a member.

### Non-goals (v1)

No multi-framework support, no auditor-facing portal, no HRIS/IdP
integrations (evidence entry is manual — see the note on the Settings page
for where a future Okta/Workday/SuccessFactors integration would plug in),
no billing.

## Tech stack

Next.js 14 (App Router) + TypeScript, SQLite via Prisma, Tailwind CSS,
custom cookie-based session auth (bcryptjs + jose — no NextAuth). Single
deployable app, no separate backend service. The policy-drafting feature
calls the Anthropic API and is the only feature that needs a key — every
other feature works without one.

## Running it locally

### 1. Install dependencies

```bash
cd complytrail
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Then edit `.env`:

- `AUTH_SECRET` — required. Generate one with `openssl rand -base64 32`.
- `ANTHROPIC_API_KEY` — optional. Get one at https://console.anthropic.com/.
  Leave it blank to run everything except policy drafting, which will show
  a "not configured" notice instead of erroring.
- `DATABASE_URL` — already set to a local SQLite file; leave as-is.

### 3. Set up the database

```bash
npx prisma migrate dev
```

This creates `dev.db`, applies the schema, and runs the seed script, which
creates a fake company ("Aurora Robotics, Inc.") with 10 controls in a mix
of states (some with evidence, some in progress, some still missing) so the
app is immediately usable rather than an empty shell.

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000 — it redirects to `/login`.

**Seeded demo logins** (all password `ComplyTrail123!`):

| Email | Role |
|---|---|
| `priya@aurorarobotics.example` | Admin |
| `marcus@aurorarobotics.example` | Member |
| `dana@aurorarobotics.example` | Member |

### Re-seeding

`npx prisma migrate reset` drops and recreates the database, then re-runs
the seed script. Useful if you want to get back to the original demo state.

## Project structure

```
complytrail/
  prisma/
    schema.prisma           Data model (Company, User, Control, ControlStatus, Evidence, PolicyDraft)
    seed.ts                 Seeds the 10 SOC 2 People Ops controls + demo company/users/evidence
  src/
    app/
      login/, register/     Public auth pages
      (app)/                 Authenticated app shell (nav, session guard)
        page.tsx              Control checklist (home)
        controls/[id]/         Control detail: status, owner, evidence
        gap-report/             Controls with no evidence, sorted/filtered
        policy-drafts/[controlId]/  Questionnaire -> Claude-drafted policy
        settings/                Team members, audit date
      api/                    Route handlers (auth, controls, evidence, policy-drafts, settings, team)
    components/              Shared UI (forms, tables, badges)
    lib/
      auth.ts                 Session cookie signing/verification (Edge-safe, no bcrypt)
      password.ts              bcryptjs hashing (Node-only, kept out of Edge middleware)
      db.ts                     Prisma client singleton
      anthropic.ts               Claude client wrapper for policy drafting
  storage/evidence/          Uploaded evidence files (gitignored, except the seed sample)
```

## Notes on some implementation choices

- **Auth is hand-rolled, not NextAuth** — a signed JWT in an httpOnly cookie
  (via `jose`), bcrypt-hashed passwords. Simple enough to reason about for a
  single-workspace, email+password app, and avoids pulling in OAuth-shaped
  machinery this app doesn't use.
- **Evidence files live on local disk** (`storage/evidence/`), served through
  an authenticated route rather than a public URL, so evidence isn't
  reachable by a guessed link. A real deployment would swap this for S3/blob
  storage behind the same route.
- **SQLite has no native enum type**, so fields like control status and
  category are plain strings at the database level; their allowed values
  live as TypeScript unions in `src/lib/types.ts` and are enforced by zod on
  every write.
