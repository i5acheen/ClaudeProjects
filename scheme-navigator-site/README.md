# Maharashtra Health Connect — website

Public website for **Maharashtra Health Connect**, an independent organisation
that helps patients in Maharashtra use free government health schemes (PM-JAY +
Mahatma Jyotirao Phule Jan Arogya Yojana, Ayushman Vay Vandana, charitable
hospital beds) — from first contact up to hospital admission. Free for patients, always.

- **Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · static generation
- **Languages:** Marathi (`/mr`, default), Hindi (`/hi`), English (`/en`)
- **Forms:** patient enquiry, partner enquiry, report a problem → Google Sheet via Apps Script
- **Hosting:** Vercel (no paid services needed to launch)

---

## 1. Run it locally

Needs Node.js 22.18 or newer.

```bash
cd scheme-navigator-site
npm install
cp .env.example .env.local   # fill in what you have; forms work in "dev mode" without a sheet
npm run dev                  # http://localhost:3000 → redirects to /mr
```

In dev mode, if `SHEET_WEBHOOK_URL` is empty, form submissions are printed to the
terminal instead of being stored (you still get a lead ID).

| Command                              | What it does                                                       |
| ------------------------------------ | ------------------------------------------------------------------ |
| `npm run dev`                        | Local development server                                           |
| `npm run build`                      | Production build (runs the placeholder + translation checks first) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript                                                |
| `npm run format`                     | Prettier                                                           |
| `npm run check:placeholders`         | Lists every `[PLACEHOLDER]` and missing env var                    |
| `npm run check:i18n -- --list`       | Lists every Marathi/Hindi string not yet reviewed                  |
| `npm run i18n:export`                | Writes `translations-review.csv` for native-speaker reviewers      |
| `npm run qr -- --url … --src …`      | Makes printable QR codes (see §6)                                  |

---

## 2. Where things live

```
app/[lang]/(site)/…        all normal pages (header, footer, sticky WhatsApp/Call bar)
app/[lang]/(landing)/lp/   ad landing pages (no navigation)
app/api/{enquiry,partner,report}/route.ts   form endpoints
content/site.ts            business name, contact details, districts, policy version
content/facts.ts           EVERY scheme fact, number, helpline and official link
content/camps.json         health camps
content/landing-pages.json ad landing pages
messages/{en,mr,hi}.json   all page text
scripts/                   placeholder check, translation check, QR codes, Apps Script
```

---

## 3. Editing content

### Facts (`content/facts.ts`)

Every number, helpline and official link comes from this one file — pages never
hard-code them. Each fact has `value`, `display` (per language), `source` and
`lastVerified`. In page text a fact is used as `{factName}` (e.g. `{coverPerFamily}`).

1. Check the fact against its `source`.
2. Update `value` / `display`.
3. Set `lastVerified` to the date you checked (`'2026-10-15'`). Scheme pages show
   "Information as of …" using the oldest date among the facts they use.

### Business details (`content/site.ts`)

Name, office address, desk hours, "call back within X hours", districts (also the
form's district dropdown), and `privacyPolicyVersion` (bump it whenever the
privacy policy text changes — it's stored with every consent).
Phone, WhatsApp, email and site URL come from environment variables.

### Health camps (`content/camps.json`)

Copy the sample object and edit it. Fields: `slug` (URL), `src` (tag stored with
every enquiry from this camp), `date` (`YYYY-MM-DD`), times, `district` (an id
from `site.ts`), and `title` / `place` / `screenings` / `bring` in `en`, `mr`, `hi`.
Each camp gets `/{lang}/camps/{slug}` and a short QR link `/c/{slug}` (which opens
the Marathi page tagged with the camp's `src`). Past camps drop off the lists automatically
(pages refresh hourly). **Delete the sample camp before launch.**

### Ad landing pages (`content/landing-pages.json`)

Each entry becomes `/{lang}/lp/{slug}` — headline, sub-headline, three points, the
patient form, WhatsApp and call. `src` is stored with every enquiry (a `src` or
UTM tags in the ad URL take priority). Landing pages are hidden from search engines.

Ad URL example: `https://YOUR-DOMAIN/mr/lp/ayushman-card-help-pune?utm_source=facebook&utm_medium=paid&utm_campaign=oct-pune`

### Translations (`messages/*.json`)

English (`en.json`) is the source. Marathi and Hindi are **drafts** and must be
checked by native speakers before launch. Every build prints a warning with the
number of unreviewed strings.

1. `npm run i18n:export` → give `translations-review.csv` to the reviewer.
2. Apply corrections to `messages/mr.json` / `hi.json` (keep `{variables}` unchanged).
3. Mark reviewed strings in that file's `_meta`: either `"reviewed": true` for the
   whole file, or list keys in `"reviewedKeys"` (a prefix like `"home"` covers the section).

A string missing from `mr.json`/`hi.json` falls back to English (and the build warns).

### Placeholders

Anything in `[SQUARE BRACKETS]` is a placeholder. On the site it shows with a
**yellow highlight**. A production build fails while any remain (or a required env
var is empty), unless `ALLOW_PLACEHOLDERS=1` is set.

---

## 4. Google Sheet setup (forms)

1. Create a Google Sheet (e.g. "MHC Leads"). Share it only with your team.
2. **Extensions → Apps Script**. Replace the code with `scripts/google-apps-script.gs`. Save.
3. **Project Settings (gear) → Script properties → Add**: `WEBHOOK_SECRET` = a long
   random string (e.g. from `openssl rand -hex 32`).
4. **Deploy → New deployment → type: Web app**. Execute as: **Me**. Who has access:
   **Anyone**. Deploy and authorise. Copy the **Web app URL**.
5. In Vercel set `SHEET_WEBHOOK_URL` = that URL and `SHEET_WEBHOOK_SECRET` = the same secret. Redeploy.
6. Send a test enquiry. Rows appear in tabs **Patients**, **Partners**, **Reports**
   (created automatically) with: lead ID, time, consent time, privacy policy version,
   source (`src`, UTM tags, landing page, page) and the form fields.

If you edit the script later: **Deploy → Manage deployments → Edit → New version**
(the URL stays the same).

**What happens on failure:** if the sheet can't be reached, the visitor sees a
friendly error with your phone and WhatsApp, and the form keeps everything they
typed. The server log records the lead ID only (never personal data).

**Spam protection:** hidden honeypot field + a simple per-IP rate limit (5 per 10
minutes per server instance). For stronger limits, add a Vercel Firewall rate-limit rule on `/api/*`.

---

## 5. Lead IDs and sources

Every submission gets an ID: `PN-261008-4F2A` (patient), `PT-…` (partner),
`RP-…` (report) — prefix, date (YYMMDD, IST), 4 random characters. It's shown on
the thank-you screen and stored in the sheet, so the desk, the hospital's monthly
report and any CSR report can trace each person.

Source capture: the first page of a visit stores `src` / `utm_*` (from the URL)
and the landing page for that browser tab; forms and WhatsApp messages include them.
WhatsApp messages end with `(src: camp-hadapsar-oct)` so the desk can tag chats too.

---

## 6. QR codes for posters and camps

```bash
# Camp poster → short camp link (already carries the camp's src)
npm run qr -- --url https://YOUR-DOMAIN/c/sample-camp-hadapsar --name hadapsar-camp

# Ration-shop notice → Get help page, tagged
npm run qr -- --url https://YOUR-DOMAIN/mr/get-help --src ration-shop-kothrud
```

PNG (1200 px, prints sharply at A4) and SVG files go to `qr-codes/`. Use a new
`src` for each place/poster so you can compare channels in the sheet.

---

## 7. Analytics and privacy

- **Vercel Web Analytics** is on by default (cookieless; enable it in the Vercel
  project → Analytics tab).
- **Google Analytics 4** (`NEXT_PUBLIC_GA_ID`) and **Meta Pixel**
  (`NEXT_PUBLIC_META_PIXEL_ID`) are optional. They load only if the variable is set
  **and** the visitor taps "Accept" on the consent banner (the banner only appears when one is set).
- Analytics only ever receive page views and one generic `lead_submitted` event.
  **No form values, health needs or personal data are sent** to any analytics or ad platform.

---

## 8. Deploying to Vercel

1. Push this repository to GitHub.
2. In Vercel: **Add New → Project → Import** the repository.
   - **Root Directory:** `scheme-navigator-site` (important — the repo root holds a different project)
   - Framework preset: **Next.js** (auto-detected)
3. Add the environment variables from `.env.example`.
   For a preview while placeholders remain, also add `ALLOW_PLACEHOLDERS=1`.
4. Deploy. Then set up the Google Sheet (§4), paste its URL and secret, **redeploy**, and send a test enquiry.
5. When ready, add your domain under **Settings → Domains**, update
   `NEXT_PUBLIC_SITE_URL`, and redeploy.

### Pre-launch checklist

- [ ] Native-speaker review of Marathi and Hindi (`npm run i18n:export`)
- [ ] Lawyer review of the privacy policy, terms and disclaimer (marked "Draft")
- [ ] Verify every fact in `content/facts.ts` against official sources; set `lastVerified`
- [ ] Replace all placeholders (`npm run check:placeholders`); remove `ALLOW_PLACEHOLDERS`
- [ ] Remove the sample camp; add real camps only with venue permission
- [ ] Test all three forms on a real Android phone on mobile data
- [ ] Confirm the WhatsApp and phone numbers work, and the desk sees the `src` tag
- [ ] Confirm the business name is cleared with your CA/lawyer (a name starting with
      "Maharashtra" must not suggest a government body — the independence line stays visible)
- [ ] Partner hospital names/logos only after a signed agreement and their approval

---

## 9. Google Business Profile

Create a profile and keep **name, address and phone exactly the same** as on the site
(footer, About page and `content/site.ts`):

- **Name:** Maharashtra Health Connect (no extra keywords — Google penalises stuffing)
- **Category:** e.g. "Health consultant" or "Non-profit organisation" — not "Hospital" or "Government office"
- **Address / service area:** your office, plus service areas Pune and Chhatrapati Sambhajinagar
- **Phone / website:** same number as `NEXT_PUBLIC_PHONE`; website = `/mr` home page
- **Hours:** same as `[CALLBACK HOURS]`
- **Description:** "Independent organisation. Free help for patients to check their PM-JAY /
  Mahatma Phule Jan Arogya Yojana / Vay Vandana cover, get documents ready and reach an
  empanelled hospital. Free for patients — we never ask for money. Not a government office."
- **Q&A / posts:** "Is it free?", "Are you government?", upcoming camps (link to camp pages)
- **Never** use government logos or the Ayushman Bharat/NHA logo in photos or posts.

---

## 10. Content rules (keep these when editing)

- Never use government emblems or the Ayushman Bharat / NHA logos, or words like
  "official" or "authorised" about us.
- Never promise approval, treatment, cures or outcomes — "we help you check / prepare".
- No testimonials, reviews, patient stories, statistics, partner names or logos unless real and approved.
- No photos implying real patients or doctors.
- No medical advice; pages about treatment say the doctor decides.
- "Free for patients" stays in the hero, forms and FAQ.
- Our work ends at admission. Patients never pay us; hospitals pay fixed fees, never per patient.
