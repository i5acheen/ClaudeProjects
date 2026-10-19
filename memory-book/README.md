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
- **Settings**: name, date of birth, book title, a note for the first page, cover photo.
- **Works with a bad connection**: a memory is saved on the phone first and uploads by itself
  when the connection is back.
- **Demo mode** at `/demo` with five sample memories — no sign-in needed.

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
   > This is the main Drive permission. It can see the files the app creates itself — never the
   > rest of your Drive.

   **Also add** `https://www.googleapis.com/auth/drive.readonly` (*"See and download all your
   Google Drive files"*). It's only requested if you switch on **Photos from Google Drive** on
   the Write page — the app uses it to look for new photos in the one folder you choose.
6. Under **Branding**, add the privacy policy link `https://memory-book-lovat.vercel.app/privacy`.
7. In the left menu open **Audience**. Leave *Publishing status* on **Testing**. Under
   **Test users** click **Add users** and add your Gmail address — plus anyone in the family
   who should be able to sign in. **Save**.

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
   | `ALLOWED_EMAILS` | *(recommended)* the Gmail addresses allowed in, separated by commas, e.g. `you@gmail.com,dad@gmail.com` |
   | `AUTH_SECRET` | *(already added for you)* — if it's missing, add any long random text of 32+ characters |

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
├─ journal.json     every memory's date, title, text, tags and photo IDs, plus the settings
└─ photos/          each photo, resized to at most 2000 px (plenty for printing)
```

- You can rename or move the folder — the app finds it by a hidden tag.
- Deleting a memory moves its photos to the Drive **bin**, where they stay for 30 days.
- On each device the app keeps a cache of photos and a copy of the book so it opens quickly;
  **Sign out** (in Settings) clears it.
- The app has no database and its server never sees your photos — they go straight between
  your browser and your Drive.

---

## 6. Good to know

- **Signing in every week.** While the Google project is in *Testing* mode, Google asks you to
  sign in again after 7 days. Nothing is lost — the app just shows a *"Please sign in again"*
  button. To stop this, you can later click **Publish app** under **Audience** in Google
  Cloud; because the app only uses the limited `drive.file` permission this is usually quick,
  but Google may ask for a privacy-policy link.
- **Family logins.** Anyone you add as a test user (and in `ALLOWED_EMAILS`) can sign in, but
  each person's book lives in *their own* Drive. Sharing one book between several accounts is
  a planned next step.
- **iPhone photos (HEIC)** are converted automatically when chosen on the phone. On a
  computer, Chrome can't read HEIC files — choose JPEGs there.
- **PDF export** uses your browser's *Save as PDF*. In the print window pick **Save as PDF**,
  set **Margins: None** and turn **Background graphics** on if those options appear.

## Project structure

See [PLAN.md](PLAN.md) for the folder layout and the main design decisions.
Demo photos are from Unsplash — see `public/demo/CREDITS.md`.
