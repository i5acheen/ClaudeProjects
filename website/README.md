# AI & Workflow Automation: Business Website

A fast, mobile-first, single-page website (plus a Privacy Policy page) built to turn visitors into **WhatsApp enquiries** and **booked discovery calls**.

- **Tech:** [Astro](https://astro.build) (static site) + [Tailwind CSS](https://tailwindcss.com) + [Lucide](https://lucide.dev) icons
- **Fonts:** Fraunces (headings) + Inter (body), self-hosted, so nothing loads from Google
- **No backend:** the enquiry form posts to Web3Forms or Formspree (free)
- **Lighthouse (tested locally):** Mobile 98 / 100 / 100 / 100 · Desktop 100 / 100 / 100 / 100 (Performance / Accessibility / Best Practices / SEO)

---

## 1. Run it on your computer

You need **Node.js 22.12 or newer** ([download](https://nodejs.org)). Check with `node -v`.

```bash
cd website
npm install        # first time only
npm run dev        # opens a live preview at http://localhost:4321
```

The preview updates instantly as you edit. Other commands:

| Command           | What it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run build`   | Builds the final site into `dist/`               |
| `npm run preview` | Serves the built `dist/` folder to double-check  |

---

## 2. Edit your content

**All text, contact details, links and settings live in one file:**

```
website/src/config/site.ts
```

Open it in any text editor (VS Code is free and good). Every placeholder is in `[SQUARE BRACKETS]`, and placeholders that are still unfilled show up **highlighted in orange** on the website, so you can spot them easily.

Things you can change there:

| Section in `site.ts` | Controls                                                         |
| -------------------- | ---------------------------------------------------------------- |
| `business`           | Name, WhatsApp number, email, booking link, pre-filled WhatsApp message |
| `seo`                | Your domain, page title, Google description, keywords            |
| `form`               | Enquiry-form service and key                                      |
| `hero` … `footer`    | Every heading, card, step, FAQ, button label and the example chat in the hero |
| `privacy`            | Privacy Policy date, retention period                            |

**Icons:** the `icon:` values are Lucide icon names. Browse [lucide.dev/icons](https://lucide.dev/icons), then use the name in PascalCase (e.g. `calendar-check` → `"CalendarCheck"`).

**Your photo:** put a portrait (around 600×750 px, JPG) in `website/public/`, e.g. `public/photo.jpg`, and set `about.photo: "/photo.jpg"`.

**Demo videos:** upload to YouTube (it can be "Unlisted"), copy the ID from the URL (`youtube.com/watch?v=`**`AbC123xyz`**) and paste it into `proof.videos[].id`. Videos only load when a visitor taps play, so they don't slow the page.

**Social-share image:** `public/og-image.png` (1200×630) is shown when your link is shared on WhatsApp, LinkedIn etc. It contains no business name, so it works as-is, but you can replace it with your own.

### Connect the enquiry form (5 minutes, free)

**Option A: Web3Forms (default, simplest)**
1. Go to [web3forms.com](https://web3forms.com) and enter the email address where you want to receive enquiries.
2. They email you an **Access Key**.
3. In `site.ts` set `form.web3formsAccessKey: "your-key-here"`.

**Option B: Formspree**
1. Create a free account at [formspree.io](https://formspree.io) and create a form.
2. Copy the endpoint (looks like `https://formspree.io/f/abcdwxyz`).
3. In `site.ts` set `form.provider: "formspree"` and `form.formspreeEndpoint: "https://formspree.io/f/abcdwxyz"`.

Until a key is added, the form politely tells visitors to use WhatsApp instead. After deploying, **send yourself a test enquiry**.

---

## 3. Deploy for free

First put the code on GitHub (it already is if you're reading this there). The website lives in the **`website/`** folder of the repository, which matters in the steps below.

### Option A: Vercel (recommended)

1. Sign up at [vercel.com](https://vercel.com) using your GitHub account (the free "Hobby" plan is fine).
2. Click **Add New… → Project**, find this repository and click **Import**.
3. Set **Root Directory** to `website` (click *Edit* next to it). Vercel detects Astro automatically; leave the build settings as they are.
4. Click **Deploy**. In about a minute you get a live link like `your-project.vercel.app`.
5. From now on, every change you push to GitHub redeploys automatically.

### Option B: Netlify

1. Sign up at [netlify.com](https://netlify.com) with GitHub.
2. **Add new site → Import an existing project → GitHub**, then choose this repository.
3. Set **Base directory** to `website`. The build command (`npm run build`) and publish directory (`dist`) are read from `netlify.toml`.
4. Click **Deploy**. You get a link like `your-site.netlify.app`.

### Connect your own domain (e.g. `www.yourbusiness.in`)

Buy a domain from any registrar (GoDaddy, Hostinger, Namecheap, Cloudflare, etc.). Then:

**On Vercel**
1. Project → **Settings → Domains** → type your domain (e.g. `yourbusiness.in`) → **Add**. Accept the suggestion to also add `www.yourbusiness.in`.
2. Vercel shows you the DNS records to create. Typically:
   - `A` record, name `@`, value `76.76.21.21`
   - `CNAME` record, name `www`, value `cname.vercel-dns.com`

   (Always use the exact values Vercel shows you, because they can change.)
3. Log in to your domain registrar → **DNS settings** → add those records (delete any old `A`/`CNAME` records for `@`/`www` that point elsewhere).
4. Wait from a few minutes up to 24 hours. Vercel adds free HTTPS automatically.

**On Netlify**
1. Site → **Domain management → Add a domain** → enter your domain → verify.
2. Either switch your registrar's nameservers to the ones Netlify gives you (easiest), **or** add the DNS records Netlify shows (`A` record for `@` to Netlify's load balancer IP, `CNAME` for `www` to `your-site.netlify.app`).
3. HTTPS is enabled automatically once DNS is verified.

**Then update the site to use the domain:** in `site.ts` set `seo.siteUrl: "https://www.yourbusiness.in"` (no trailing slash), commit and push. This fixes your canonical URLs, sitemap, social previews and Google listing data.

### After going live (recommended)

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)): add your domain and submit `https://www.yourbusiness.in/sitemap.xml`.
2. **Google Business Profile** ([business.google.com](https://business.google.com)): create or claim your free listing for Pune and add your website link. This matters a lot for "near me" and local searches.
3. Test the share preview by pasting your link into a WhatsApp chat to yourself.

---

## 4. What's included

- `/` the home page with all 11 sections, a floating WhatsApp button, and the missed-leads calculator (Indian number format, clearly labelled as an estimate)
- `/privacy` a DPDP Act-aware Privacy Policy **template** (review before publishing)
- `/sitemap.xml`, `/robots.txt`, a custom 404 page
- SEO: page title and description, keywords, canonical URL, Open Graph and Twitter cards, `ProfessionalService` (LocalBusiness) and `FAQPage` structured data
- Accessibility: skip link, keyboard-friendly menu and FAQ, visible focus states, AA colour contrast, large tap targets, reduced-motion support

### Project structure

```
website/
├── src/
│   ├── config/site.ts      ← ALL your content & settings
│   ├── components/         ← one file per page section
│   ├── layouts/Layout.astro← <head>, SEO tags, structured data
│   ├── pages/              ← index, privacy, 404, sitemap.xml, robots.txt
│   └── styles/global.css   ← colours, fonts, shared styles
├── public/                 ← favicon, social image, your photo
├── vercel.json / netlify.toml
└── README.md
```

### Colours (in `src/styles/global.css`)

| Name        | Hex       | Used for                         |
| ----------- | --------- | -------------------------------- |
| Deep teal   | `#0F4C45` | Main brand colour, headings      |
| Saffron     | `#E8A33D` | Accents, highlights, CTA band    |
| Cream       | `#FBF7F0` | Page background                  |
| Sand        | `#F3EBDD` | Alternate section background     |
| Ink         | `#1C2421` | Body text                        |
| WhatsApp    | `#0E7A3F` | WhatsApp buttons only (a darker green for readable white text) |

---

## 5. Placeholder checklist

Everything below is in `src/config/site.ts` unless noted.

**Must do before launch**
- [ ] `business.name`: your business name
- [ ] `business.owner`: your name (also used in the About heading and Privacy Policy)
- [ ] `business.whatsappNumber`: digits only with country code, e.g. `919876543210`
- [ ] `business.phoneDisplay`: how the number is shown, e.g. `+91 98765 43210`
- [ ] `business.email`
- [ ] `business.bookingUrl`: Cal.com / Calendly / Google Calendar booking page (until then, "Book a call" buttons open WhatsApp)
- [ ] `seo.siteUrl`: your final domain
- [ ] `form.web3formsAccessKey` (or the Formspree endpoint), then send a test enquiry
- [ ] `contact.intro`: your typical response time
- [ ] FAQ answers: fill in tools/platforms, data-safety specifics, typical timelines, post-launch fix period, and read every answer to confirm it matches how you actually work
- [ ] About text: check it reads true to you
- [ ] Privacy Policy: `privacy.lastUpdated`, `privacy.retentionPeriod`; read the whole policy; then remove the yellow "TEMPLATE" box at the top of `src/pages/privacy.astro`

**Add when you have them (never invent these)**
- [ ] `about.photo`: your photo
- [ ] `proof.videos`: YouTube IDs for demo videos
- [ ] `proof.caseStudy`: one real case study, with the client's permission
- [ ] `proof.testimonial`: one real testimonial, with the client's permission

**Optional**
- [ ] `pricing`: add "starting from" prices if you decide to show them
- [ ] `public/og-image.png`: custom social-share image
- [ ] `calculator.defaults`: the example numbers the calculator starts with
