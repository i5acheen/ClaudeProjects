# Memory Book

A digital baby journal that looks and feels like a real, hand-made keepsake book —
cream paper, polaroids, washi tape, handwriting and a page-turn you can swipe.
Photos and words are stored in **your own Google Drive**, not on anyone's server.

**What it does**

- Sign in with Google.
- **Add a memory** from your phone: 1–4 photos (camera or gallery), the date (read from the
  photo automatically), a title, a few lines or paragraphs, and tags (First, Milestone,
  Festival, Family, Funny). The age is worked out for you — e.g. *"5 months, 12 days old"*.
- **Book view** with a real page-turn; one page at a time on a phone (swipe), two on a computer.
- **Timeline** of every memory — tap one to jump to its page.
- **Edit or delete** any memory.
- **Download a PDF** of the whole book, one year of her life, a calendar year or any dates —
  A4 or 8 × 8 inch square, ready to print.
- **Write straight into the journal**: from the pen button, **New page** (pick photos right on the
  page and write on its lines), **Write on this page**, or **Write a letter** to your child —
  which can be sealed as a time capsule until a chosen birthday.
- **Month pages** with height and weight, Indian milestone tags (Naamkaran, Annaprashan, Mundan,
  First Diwali, First Holi), full-screen reading, and **one book per child**.
- **Styles**: seven cover designs and six writing styles (handwritten fonts or typewriter),
  chosen when you start the book and changeable any time.
- **Family sharing** by email — see below.
- **Settings**: name, date of birth, book title, a note for the first page, cover photo.
- **Works with a bad connection**: a memory is saved on the phone first and uploads by itself
  when the connection is back.
- **Demo mode** at `/demo` with five sample memories — no sign-in needed.
- **Safe by design**: weekly backups in your Drive, automatic repair of damaged files, nothing
  lost if two people save at once, and a privacy notice and *Delete my account* that follow
  India's DPDP Act.

> **Going live for other families?** Everything to do outside the code (domain, Google
> verification, account store, Razorpay, policies, monitoring) is in
> [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md). Security findings and their status are in
> [SECURITY_AUDIT.md](SECURITY_AUDIT.md); the breach plan is [BREACH_RESPONSE.md](BREACH_RESPONSE.md).

---

## Contents

1. [Set up Google (one time, ~15 minutes)](#1-set-up-google-one-time)
2. [Put the keys into Vercel](#2-put-the-keys-into-vercel)
3. [Run it on your own computer (optional)](#3-run-it-on-your-own-computer-optional)
4. [Deploy a fresh copy to Vercel (only if starting over)](#4-deploy-a-fresh-copy-to-vercel-only-if-starting-over)
5. [Where your data lives](#5-where-your-data-lives)
6. [Good to know](#6-good-to-know)

The live app is at **https://memory-book-lovat.vercel.app**. Steps 1 and 2 switch on
"Sign in with Google" there.

---

## 1. Set up Google (one time)

Google needs to know about the app before it lets anyone sign in. You'll create a free
"project" in Google Cloud — no payment details are needed. Google renames buttons now and
then, so if a name below doesn't match exactly, look for the closest one.

### 1a. Create a project

1. Go to <https://console.cloud.google.com> and sign in with **the Google account whose Drive
   should hold the book**.
2. At the top left, click the project picker (it may say *"Select a project"*) → **New project**.
3. Name it `Memory Book` → **Create**. Wait a few seconds, then make sure it's selected in the
   project picker.

### 1b. Turn on the Google Drive API

1. In the search bar at the top, type **Google Drive API** and open it.
2. Click **Enable**.

### 1c. Set up the sign-in screen ("OAuth consent screen")

1. Search for **Google Auth Platform** (older name: *OAuth consent screen*) and open it.
   Click **Get started**.
2. **App information**: App name `Memory Book`; User support email — your email. **Next**.
3. **Audience**: choose **External**. **Next**.
4. **Contact information**: your email. **Next**, tick the agreement, **Create**.
5. In the left menu open **Data Access** → **Add or remove scopes**. In the list, find and tick
   the one ending in **`/auth/drive.file`** (*"See, edit, create and delete only the specific
   Google Drive files you use with this app"*). If it isn't listed, paste
   `https://www.googleapis.com/auth/drive.file` into *"Manually add scopes"*.
   Click **Update**, then **Save**.
   > This is the **only** Drive permission Memory Book asks for. It can see the files the app
   > creates itself, and photos or books you pick in Google's own picker window — never the
   > rest of your Drive. (If you added `drive.readonly` or `drive` here earlier, remove them.)
6. Under **Branding**, add the privacy policy link `https://memory-book-lovat.vercel.app/privacy`.
7. In the left menu open **Audience**. Leave *Publishing status* on **Testing**. Under
   **Test users** click **Add users** and add your Gmail address — plus anyone in the family
   who should be able to sign in. **Save**.

### 1c-2. Switch on Google's picker (for "Photos from Google Drive" and family)

1. In the search bar type **Google Picker API**, open it and click **Enable**.
2. Open **APIs & Services → Credentials → Create credentials → API key**. Copy the key.
3. Click the new key to edit it:
   - **Application restrictions**: *Websites*; add `https://memory-book-lovat.vercel.app/*`
     (and later your own domain, plus `http://localhost:3000/*` for testing).
   - **API restrictions**: *Restrict key* → tick only **Google Picker API**. **Save**.
4. Find your **project number**: click the project name at the top → it's the number next to
   *Project number* (not the project ID).
5. In Vercel → your project → **Settings → Environment Variables** add:
   - `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` = the API key from step 2
   - `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` = the project number from step 4

   > These two are meant to be public (they appear in the web page), unlike the client secret.
   > The restrictions in step 3 make the key useless on any other website.

### 1d. Create the keys ("OAuth client")

1. In the left menu open **Clients** (older name: *Credentials*) → **Create client**.
2. **Application type**: **Web application**. Name: `Memory Book web`.
3. Under **Authorized JavaScript origins** click **Add URI** twice and enter:
   - `https://memory-book-lovat.vercel.app`
   - `http://localhost:3000`
4. Under **Authorized redirect URIs** click **Add URI** twice and enter:
   - `https://memory-book-lovat.vercel.app/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
5. Click **Create**. A box shows your **Client ID** and **Client secret**.
   **Copy both somewhere safe now** (or click *Download JSON*) — Google may not show the
   secret again. Treat the secret like a password: don't post it anywhere.

---

## 2. Put the keys into Vercel

1. Go to <https://vercel.com>, open the **memory-book** project → **Settings** →
   **Environment Variables**.
2. Add these (for *all* environments), clicking **Save** after each:

   | Name | Value |
   | --- | --- |
   | `AUTH_GOOGLE_ID` | the **Client ID** from step 1d |
   | `AUTH_GOOGLE_SECRET` | the **Client secret** from step 1d |
   | `ALLOWED_EMAILS` | *(optional, for a closed test)* the Gmail addresses allowed in, separated by commas. Leave empty to let anyone sign up. |
   | `AUTH_SECRET` | *(already added for you)* — if it's missing, add any long random text of 32+ characters |
   | `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`, `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER` | from step 1c-2 (Google's picker) |
   | `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_OPERATOR_ADDRESS` | your name or company and address, shown on the policy pages |
   | `KV_REST_API_URL`, `KV_REST_API_TOKEN` | added for you when you connect the account store (see the checklist) |

3. Go to **Deployments**, open the menu (⋯) on the newest one → **Redeploy**.
4. Open <https://memory-book-lovat.vercel.app> → **Sign in with Google**.
   The first time, Google will warn *"Google hasn't verified this app"* — that's expected for
   a private app in Testing mode. Click **Continue**, allow access, and you'll be asked for your
   daughter's name and date of birth. The book folder is created in your Drive and you're in.

> **Tip for your phone:** open the site in Safari/Chrome and choose **Add to Home Screen** —
> it then opens like an app.

---

## 3. Run it on your own computer (optional)

You only need this to change the code. You need [Node.js](https://nodejs.org) 20 or newer
(the "LTS" download).

1. Open a terminal in this `memory-book` folder.
2. Copy `.env.example` to a new file called `.env.local` and fill in the values (the same as
   in step 2; for `AUTH_SECRET` run `npx auth secret` or type any long random text).
3. Install and start:
   ```bash
   npm install
   npm run dev
   ```
4. Open <http://localhost:3000>. The demo is at <http://localhost:3000/demo>.

---

## 4. Deploy a fresh copy to Vercel (only if starting over)

The app is already deployed. If you ever need a new copy:

1. On <https://vercel.com/new>, import the GitHub repository.
2. Set **Root Directory** to `memory-book` (the framework is detected as Next.js).
3. Add the environment variables from step 2 and click **Deploy**.
4. Your new address will be different — add it to the **JavaScript origins** and
   **redirect URIs** in step 1d (`https://<your-address>` and
   `https://<your-address>/api/auth/callback/google`).

Everything fits in Vercel's and Google's free tiers.

---

## 5. Where your data lives

In your Google Drive you'll find:

```
Memory Book – <child's name>/
├─ book.json            the book's details: child, cover, style, height & weight
├─ memories-2026.json   every memory of 2026: date, title, words, tags, photo IDs
├─ memories-2027.json   … one file per year
├─ photos/              each photo (up to 2400 px, print-sharp) + a smaller copy for the screen
└─ backups/             a weekly copy of all the words and dates (the last 4)
```

- Older books (one `journal.json`) are converted automatically the first time you open them;
  `journal.json` is copied into `backups/` first and left untouched.
- You can rename or move the folder — the app finds it by a hidden tag.
- Deleting a memory moves its photos to the Drive **bin**, where they stay for 30 days.
- If a file is ever damaged or deleted, the app repairs it from Drive's history or the latest
  backup and tells you; **Settings → Backups** can bring back missing memories.
- Photos lose their location (GPS) data before upload, so a shared book or PDF never reveals where
  you live.
- On each device the app keeps a cache of photos and a copy of the book so it opens quickly;
  **Sign out** (in Settings) clears it, and also cancels the app's Google access.
- Memory Book's server never sees your photos or words — they go straight between your browser and
  your Drive. On our side there's only a tiny account record: a coded account number (not your
  email), when you agreed to the privacy notice, and later your plan.

---

## 6. Good to know

- **Signing in every week.** While the Google project is in *Testing* mode, Google asks you to
  sign in again after 7 days. Nothing is lost — the app just shows a *"Please sign in again"*
  button. To stop this, you can later click **Publish app** under **Audience** in Google
  Cloud; because the app only uses the limited `drive.file` permission this is usually quick,
  but Google may ask for a privacy-policy link.
- **Family sharing.** In **Settings → Family**, invite someone by email as *can view* or
  *can add memories*. The app shares your book folder through Google Drive's own sharing, and
  Google emails them the invitation — nothing about your family is stored by Memory Book. They
  sign in with that Google account; the book usually opens straight away. If it doesn't, they tap
  **"Open a book shared with me"** and choose it once in Google's picker. Family never give the app
  access to the rest of their Drive, and people who can add memories can't share the book onwards.
  While your Google project is in *Testing* mode, also add their email as a test user (step 1c).
- **Photos from Google Drive.** On the Write page, tap **Choose photos from Google Drive** and tick
  photos in Google's window. They're copied into the book, resized and without location data,
  ready for your words. Photos already in the book are skipped. After that, the **↻ Check for new
  photos** button (top of the Write page) opens the same folder again so you can tick the new ones.
  The app can't watch a folder by itself: that would need permission to read your whole Drive.
- **Share from your phone (Android).** Install Memory Book (see below), then in Google Photos or
  your Gallery select photos and tap **Share → Memory Book**. They go straight into the book. The
  photos travel from your phone to your Google Drive — never through our server. (iPhones don't
  offer this for web apps; use **Choose photos** on the Write page instead.)
- **Install it like an app (free, no app store).** On Android (Chrome): open the site, tap
  **Install Memory Book** in Settings or on the first page, or the browser menu **⋮ → Install app**.
  On iPhone (Safari): **Share → Add to Home Screen**. On a computer (Chrome/Edge): the install
  icon at the right of the address bar. It then opens full screen with its own icon. Only the
  app itself is saved on the device — your journal still lives in your Google Drive.
- **Reading full screen.** In the Journal, tap the ⛶ button (bottom left) to read the book on its
  own, filling the screen. Tap ✕ or press Esc to come back.
- **iPhone photos (HEIC)** work everywhere: browsers that can't open them convert them first,
  on your device (using the open-source libheif, in its own sandbox).
- **Your data.** Settings → **Download everything** (all words and details as a file; photos are in
  your Drive folder) and **Delete my account** (you choose whether the book stays in your Drive).
- **Testing changes.** `npm run build`, start it with `npx next start -p 3100`, then
  `npm run test:e2e` — over 100 checks run against a pretend Google Drive.
- **PDF export** uses your browser's *Save as PDF*. In the print window pick **Save as PDF**,
  set **Margins: None** and turn **Background graphics** on if those options appear.

## Project structure

See [PLAN.md](PLAN.md) for the folder layout and the main design decisions.
Demo photos are from Unsplash — see `public/demo/CREDITS.md`. iPhone (HEIC) photos are decoded with
[libheif](https://github.com/strukturag/libheif) (LGPL-3.0), shipped unmodified as a separate file
(`public/vendor/libheif/`, copied at build time) with its licence.
