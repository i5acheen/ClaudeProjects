# Memory Book — Security Audit

*Part 0 of the production-readiness work. Audit date: 19 October 2026. Code reviewed: branch
`claude/memory-book-journal-roqoir`, commit `b68e793`. No code was changed for this audit.*

> **Update (Part 1):** all four High findings are fixed and tested (status below). The Medium and
> Low findings are still open; most are covered by Part 2.

## The short version

- **Nothing Critical was found.** No one can open another family's book by guessing a link or
  an ID, photos are never stored or cached on our servers, and no file is ever shared "with
  anyone who has the link".
- **4 High findings** need fixing before you sell. In plain words:
  1. **Family members are asked for too much access to their Google Drive.** The app asks
     them for permission to see their whole Drive, and those who can add memories are asked to
     change it too.
  2. **A family member who can add memories can share the whole book** with anyone, even
     publicly.
  3. **The website has no protective security headers.** If a bug ever let someone run
     their own code on the page, they could steal the user's Google access.
  4. **Two people saving at the same moment** can make one memory disappear from the book.
- **8 Medium and 6 Low findings**: mostly recovering from damaged files, data left on shared
  computers, and long sign-in sessions.

### How this app is built, and why it matters for security

Most apps keep your photos on their own servers. Memory Book doesn't: **your browser talks
straight to Google Drive** using a temporary Google "key" (an access token). Google itself
checks every request. Our server only handles Google sign-in and stores nothing (no database).

- **Good:** whole classes of attack don't exist here. No one can steal photos from our
  servers or guess another family's ID, and no private photo is ever cached publicly. Google
  is the gatekeeper.
- **The trade-off:** the browser holds a live Google key for up to an hour. So the most
  important defences are **keeping the scopes small** (what that key can open) and
  **making the page itself very hard to attack** (H-1 and H-3).

Severity scale: **Critical** = being exploited or trivially exploitable now · **High** = must fix
before selling · **Medium** = fix soon · **Low** = good hygiene.

---

## High

### H-1 · Family members and folder-watching ask for access to the person's whole Google Drive
- **Where:** `src/components/journal/JournalProvider.tsx:513` (folder watching asks for
  `drive.readonly`), `src/components/journal/JournalProvider.tsx:692` (family members: view
  asks for `drive.readonly`, "can add" asks for the full `drive` scope).
- **What an attacker could do:** if the app or its website were ever compromised, the attacker
  could **read, and for "can add" members also change or delete, every file in those people's
  whole Google Drive**, not just the book.
- **Also:** Google classes these two scopes as *restricted*. Using them in production means a
  yearly paid security assessment (CASA), which costs roughly $500–$4,500 a year and takes weeks.
- **Fix:** go back to **`drive.file` only, for everyone**, and use Google's official
  **file/folder Picker**. When a person picks a folder or file in Google's own window, Google
  gives the app access to exactly that item:
  - **Family members** open the shared book once through the Picker.
  - **Folder watching** works the same way: you pick the folder, so the app can see that
    folder only. One detail needs checking during the fix: whether the app also sees photos
    added to the folder later. If Google doesn't allow that, I'll pick the closest option
    that keeps the small scope and explain it to you.
  - **Your part:** turn on the Picker in Google Cloud. It's a 5-minute task; it will be in
    `PRODUCTION_CHECKLIST.md`.
- **Status:** ✅ **Fixed (Part 1).**
  - The app now asks everyone for `drive.file` only, and no longer keeps permissions granted
    earlier.
  - **Photos from Google Drive:** you choose photos in Google's picker, and the app can open
    only those. Automatic folder watching is gone, because it needed the wide permission.
  - **Family:** a shared book usually opens straight away. If Google doesn't show it, they
    choose it once in the picker.
  - **Tests:**
    - the app can't open a Drive photo you haven't picked;
    - family open a shared book through the picker;
    - no wider permission is requested anywhere in the code.
  - **You must:**
    - Switch on the Picker API and add its two settings (README step 1c-2).
    - Remove `drive.readonly` and `drive` from Google Cloud → Data Access.
    - On the live site, check with your own and a family account that the book opens and
      that photos can be picked.
    - Anyone who granted the old wide permission can remove it at
      myaccount.google.com/permissions, then sign in again.

### H-2 · A "can add memories" member can re-share the book with anyone, even publicly
- **Where:** `src/lib/drive/drive-repository.ts:137-141` (sharing the book folder),
  `src/lib/drive/client.ts:314-321` (adding a Drive permission).
- **What an attacker could do:** Google Drive lets editors share by default. So a relative with
  "can add memories" (or someone who took over their Google account) could **share all your
  child's photos with strangers, or make them "anyone with the link"**.
- **Fix:**
  1. Turn off "editors can share" on the book folder, `journal.json`, the photos folder and
     every new file (Drive's `writersCanShare = false` setting).
  2. Each time the owner opens the book, check its sharing list. Remove any "anyone with the
     link" or whole-organisation sharing, and anyone the owner didn't invite, and tell the
     owner.
- **Status:** ✅ **Fixed (Part 1).**
  - Every new file and folder is created with "editors can share" switched off.
  - The first time the owner opens the book, older photos are locked the same way.
  - Each time the owner opens the book, any "anyone with the link" or whole-organisation
    sharing is removed, and a 🔒 note explains what happened.
  - **Tests:**
    - a "can add" member is refused when they try to share;
    - every book file is locked;
    - a public link added outside the app is removed, and the owner is told.

### H-3 · No security headers, while the browser holds a Google access key
- **Where:**
  - `next.config.ts`: no headers are set. Only Vercel's default `Strict-Transport-Security`
    is sent; I checked the live site.
  - `src/auth.ts:120`: hands the Google access token to the page through
    `/api/auth/session`, which `src/lib/drive/client.ts:64` reads.
- **What an attacker could do:**
  - **Steal the key:** if any bug ever let outside code run on the page (cross-site
    scripting), it could copy the user's Google access key. With it, they could reach the book
    for up to an hour, and more if H-1 isn't fixed.
  - **Trick clicks:** another website could also show the app invisibly inside its own page
    and trick a parent into clicking buttons (clickjacking).
- **Today:** I found **no such bug**. React escapes all text, and nothing uses
  `dangerouslySetInnerHTML`. The headers are the safety net in case one ever appears.
- **Fix:** add a strict Content-Security-Policy:
  - Only our own scripts may run.
  - The page may only talk to our server and Google's APIs.
  - Images may only come from us, Google, `blob:` and `data:`.
  - No one may embed the app (`frame-ancestors 'none'`).
  - Also add `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`,
    `Permissions-Policy` (no microphone, location or payment APIs unless needed),
    `X-Content-Type-Options: nosniff` and `Cross-Origin-Opener-Policy`.
  - Add a test that checks the headers are present.
- **Status:** ✅ **Fixed (Part 1).**
  - Every page now has a strict Content-Security-Policy with a fresh one-time code (nonce)
    on each request: `src/proxy.ts` and `src/lib/security/csp.ts`.
  - All other responses get `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
    `Permissions-Policy`, `Cross-Origin-Opener-Policy` and HSTS (`next.config.ts`).
  - **Tests:**
    - the headers are present and the nonce changes on every request;
    - no part of the app is blocked by its own policy.
  - **How to check:** open the live site, press F12, go to **Network**, click the page and look
    at **Response Headers**.

### H-4 · Two people saving at the same moment can lose a memory
- **Where:** `src/lib/drive/drive-repository.ts:74-79`. Saving reads `journal.json`, adds the
  change, then writes the whole file back, with no check in between.
- **What could happen:** if you and a grandparent save within the same second or two (or two
  phones import from the watched folder together), **the second save overwrites the first**.
  The memory vanishes from the book. Its photos stay in Drive, but they are no longer in the
  book.
- **Fix now (Part 1):**
  1. Note the file's version number before writing.
  2. Write, then check that no one else wrote in between.
  3. If someone did, re-read, merge (keeping both memories) and write again.
  4. Add a test that runs two saves at once and checks both memories survive.
- **Fix later (Part 2, A1/A2):** split the journal into one small file per memory, so two
  people adding different memories never touch the same file.
- **Status:** ✅ **Fixed (Part 1).**
  - A save now reads one exact version of `journal.json` and writes the change.
  - It then checks Drive's version history. If someone else's save landed in between, it
    re-applies the change on top of their version, so both are kept.
  - **Test:** a family member's memory is saved "at the same moment" as yours, and both are in
    the book afterwards.
  - Splitting the journal into one file per memory (Part 2, A1) will make this even more
    robust.

---

## Medium

### M-1 · A hand-edited or partly broken `journal.json` silently loses entries on the next save
- **Where:** `src/lib/repository.ts:76`. When the file is read, memories without a valid `id`
  or `date` are skipped. The next save then writes the file without them, so they are gone
  for good.
- **What could happen:** a family member (or a sync tool) damages one entry, and the app
  **permanently deletes it** the next time anyone saves.
- **Fix:** never drop data on save. Keep any entry the app can't understand as it is, show
  "1 memory couldn't be read" with an option to fix or restore it, and add a test.
- **Status:** Open (it goes with Part 2 A4).

### M-2 · A damaged `journal.json` locks you out of the book, with no recovery
- **Where:** `src/lib/drive/drive-repository.ts:154-155` (the file is read with no protection
  against a damaged file).
- **What could happen:** the app shows an error and stops. **Nothing is wiped**, because saving
  stops too. But a parent can't get back in without knowing how to use Drive's "Manage
  versions".
- **Fix:** a recovery screen that offers to restore from the last good Drive version or from a
  backup (Part 2 A3/A4).
- **Status:** Open.

### M-3 · If `journal.json` is deleted, the app starts a brand-new empty book
- **Where:** `src/lib/drive/drive-repository.ts:177` (no journal is treated as no book) and
  `src/components/journal/JournalProvider.tsx:197` (the app then shows first-time setup).
- **What could happen:** the parent sees the setup screen and creates a second book. The old
  photos are left, unused, in the old folder. It looks like **everything is gone**, although
  nothing has really been deleted.
- **Fix:** if the book folder exists but its journal doesn't, offer to restore it from Drive's
  bin, an older version or a backup. As a last resort, rebuild the pages from the photos.
- **Status:** Open.

### M-4 · Data stays on a shared or borrowed computer if you don't press "Sign out"
- **Where:**
  - `src/components/journal/JournalProvider.tsx:167`: the journal is copied into the
    browser's storage.
  - `src/components/journal/JournalProvider.tsx:176`: when a session just expires, nothing
    is cleared.
  - `src/lib/photo-cache.ts`: photo copies are not separated by account.
  - `public/sw.js:48`: offline copies of pages are kept.
- **What could happen:** anyone who later uses that browser profile could dig the child's name,
  memories and photos out of the browser's storage. "Sign out" clears everything; a session
  that simply expires does not.
- **Fix:**
  - Clear the stored copies whenever the app finds the user signed out, and keep photo copies
    per account.
  - Add a "This is a shared computer — don't keep anything" option at sign-in.
  - Stop keeping offline copies of signed-in pages; only the empty app shell is needed.
- **Status:** Open.

### M-5 · Signing out doesn't cancel the app's Google access, and sessions last 30 days
- **Where:** `src/auth.ts:63` (`maxAge` of 30 days), `src/components/settings/SettingsForm.tsx:96-109`
  (sign-out never contacts Google).
- **What an attacker could do:** someone who copied the sign-in cookie (for example from an
  infected computer) **keeps access to the book for up to 30 days**. Signing out doesn't stop
  that copy, and with no database the server can't cancel it either.
- **Fix:**
  - On "Sign out", tell Google to cancel the app's access (Google's token revoke address).
  - Shorten sessions to 14 days, renewed automatically while the app is in use.
  - Add a "Sign out everywhere" button that cancels Google access.
- **Status:** Open.

### M-6 · A "can add memories" member can wipe or rewrite the whole journal
- **Where:** this is how Drive editing works. Editors can change `journal.json`.
- **What could happen:** someone with "can add" access (or someone who took over their account)
  could **empty or rewrite the book**. Drive keeps old versions for 30 days, but there's no easy
  way back in the app.
- **Fix:** weekly automatic backups (Part 2 A3) and a "restore" screen (M-2).
- **Status:** Open.

### M-7 · Photos added by family members belong to them, not to you
- **Where:** `src/lib/drive/drive-repository.ts:85-89` (uploads are owned by whoever uploads
  them).
- **What could happen:**
  - After you remove a family member, **they still own the photos they added** and can
    still open them.
  - If they delete their Google account, **those photos disappear from your book**.
- **Fix:** Part 2 A9 (copy them into your Drive), plus a warning when removing a member.
- **Status:** Open.

### M-8 · Google sign-in is still in "Testing" mode
- **Where:** Google Cloud settings, not code.
- **What it means:** only people you list can sign in, and everyone has to **sign in again every
  7 days**, because Google expires the long-term token. Selling to families needs a verified
  app, which first needs H-1 fixed and your own domain.
- **Fix:** Part 2 E26/E27, plus the steps in `PRODUCTION_CHECKLIST.md`.
- **Status:** Open (you need to do this in Google Cloud, outside the code).

---

## Low

### L-1 · No size limit on photos
- **Where:** `src/lib/images.ts:18` (`decode`).
- **What could happen:** a very large file (say 300 MB) can freeze the parent's own browser
  tab. It harms no one else.
- **Fix:** refuse files over about 40 MB with a friendly message.
- **Status:** Open.

### L-2 · Google's raw error text is shown to users
- **Where:** `src/lib/drive/client.ts:126-130`.
- **What could happen:** the message is confusing but contains no secrets.
- **Fix:** turn the common errors (storage full, offline, no access) into plain sentences.
- **Status:** Open (it goes with Part 2 A8).

### L-3 · No limit on sending invites
- **Where:** `src/components/settings/FamilyCard.tsx:34`.
- **What could happen:** a signed-in user could send many invites in a row. Google sends the
  emails from the user's own account and limits them, so there's little room for abuse.
- **Fix:** a short pause between invites, and a limit of about 20 per day.
- **Status:** Open.

### L-4 · Offline copies of signed-in pages contain the user's email address
- **Where:** `public/sw.js:44-51`.
- **Fix:** keep only the empty app shell offline (see M-4).
- **Status:** Open.

### L-5 · The `ALLOWED_EMAILS` sign-in allowlist
- **Where:** `src/auth.ts:66-68`.
- **What it means:** it's useful while testing. Before launch, decide whether to remove it or
  keep it for a closed beta.
- **Status:** Decide at launch.

### L-6 · The sign-in library is a beta version
- **Where:** `package.json` (`next-auth@5.0.0-beta.32`).
- **What it means:** it is widely used, but it's not a "stable" release yet. Pin the exact
  version, watch its security notices, and let Dependabot (Part 2 I43) suggest updates.
- **Status:** Open.

---

## Checked and found safe

| Check | Result |
|---|---|
| Logged in, and owner or member of *this* book | ✅ The app has no API routes of its own except Google sign-in. Every read and write goes straight to Google Drive with the user's own key, so **Google checks every request**. |
| Guessing IDs in links like `/book/edit/<id>` | ✅ The ID only picks a memory inside *your own* journal, which the app loaded with your own key. Someone else's ID finds nothing and opens nothing. |
| Routes that serve or proxy photos, public caching | ✅ There aren't any. Photos go from Google to your browser directly; they never pass through our server, Vercel's cache or `next/image`. On-device copies live only in that browser. |
| "Can view" members writing, inviting or changing settings | ✅ Enforced by Google, since viewers have read-only access to the folder. The app also hides those buttons. |
| Removing a member removes their Drive access | ✅ `drive-repository.ts:143-146` deletes the Drive permission (photos they uploaded themselves: see M-7). |
| "Anyone with the link" sharing | ✅ Never used; invites are always to a named Google account (`client.ts:319`). It can still happen through H-2 until that's fixed. |
| Refresh token reaching the browser or logs | ✅ It stays inside the encrypted sign-in cookie (Auth.js encrypts it). That cookie is `HttpOnly` (page scripts can't read it), `Secure` (sent over HTTPS only) and `SameSite=Lax`. Nothing logs tokens; there are no `console.log` calls. |
| Open redirects after sign-in | ✅ The app only redirects to its own fixed pages, and Auth.js refuses outside addresses. |
| CSRF (tricking a browser into actions) | ✅ Auth.js protects sign-in and sign-out with CSRF tokens, and Next.js checks where server actions come from. There are no other state-changing server endpoints. |
| XSS in titles, text, names, notes, emails, PDF | ✅ React escapes all of it; nothing uses `dangerouslySetInnerHTML`, and the PDF is built from the same pages. |
| Uploads: real images only, no SVG/HTML, GPS removed | ✅ Every photo (memories, cover, folder imports) is opened and redrawn as a new JPEG in the browser before upload. Anything that isn't an image fails, SVG/HTML can't get through, and **all photo metadata, including GPS location, is removed**. The date taken is read first. |
| Drive search "injection" through names | ✅ Values are escaped (`client.ts:153`); the child's name is never put into a search. |
| Server fetching user-supplied URLs (SSRF) | ✅ The server fetches only Google's fixed token address. |
| Secrets in code, `NEXT_PUBLIC_` variables, git history | ✅ No secrets. `.env.local` is not in git; the only env file in the history is `.env.example`, with empty values. The two new `NEXT_PUBLIC_GOOGLE_…` values for Google's picker are **public by design**. Restricting the key to your website and the Picker API (README step 1c-2) makes it useless anywhere else. |
| Error pages exposing internals | ✅ There are no custom API routes, and Next.js hides stack traces in production. |
| `npm audit` | ✅ **0 known vulnerabilities**. Outdated: `next-auth` is beta (L-6); `typescript` and `@types/node` have newer major versions, which only affect development. |
| Premium and payments trusted from the browser or Drive | ⏳ Not in the code yet. Rules for that work: **plan status lives only on our server**, is set only after verifying Razorpay's signed webhook, and is never read from the browser or from Drive files. |

## One thing to decide before Part 2

Several items you asked for need **a very small server-side store**: Premium status, "delete my
account records", rate limits and scheduled backups or reminders. I'd keep it to the minimum:
your Google email, your plan and payment references. **No child data, photos or memories**
would ever go there. Your privacy promise would become "*your child's photos and stories live
only in your own Google Drive*" (still true), rather than "*we store nothing*". I'll suggest a
specific option when we reach that step.

## Part 1 — done

H-1 to H-4 are fixed, with tests. For H-1 you need to switch on Google's picker in Google Cloud
(about 5 minutes, README step 1c-2). Until you do, "Choose photos from Google Drive" shows a
message saying it isn't set up yet; everything else works as before.
