# Production checklist

Everything to do **outside the code** before families can sign up and pay. Tick each box as
you go. Most steps take minutes; Google's checks and Razorpay's KYC take a few days, so start
them early.

## 1. Your own web address (domain)

You need a proper address for Google's checks, Razorpay, and people's trust.

- [ ] Buy a domain, for example `memorybook.in`. Any registrar is fine (GoDaddy, Namecheap,
      Google Domains' successor Squarespace, or Vercel itself).
- [ ] In **Vercel → memory-book → Settings → Domains**, add it and follow the DNS steps shown
      there. Make it the **primary** domain, so `…vercel.app` redirects to it.
- [ ] In **Google Cloud → Google Auth Platform → Clients → your client**, add:
  - [ ] Authorized JavaScript origins: `https://<your-domain>`
  - [ ] Authorized redirect URIs: `https://<your-domain>/api/auth/callback/google`
- [ ] In **Google Cloud → APIs & Services → Credentials → your Picker API key → Website
      restrictions**, add `https://<your-domain>/*`.
- [ ] Open `https://<your-domain>`, sign in, and check the book opens.

## 2. Settings in Vercel (Environment Variables)

Check each of these in **Vercel → Settings → Environment Variables**, then **Redeploy**:

- [ ] `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`: already there.
- [ ] `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY` and `NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER`: see
      README step 1c-2. "Choose photos from Google Drive" needs them.
- [ ] `NEXT_PUBLIC_OPERATOR_NAME`: your full name, or your company's registered name.
- [ ] `NEXT_PUBLIC_OPERATOR_ADDRESS`: a postal address. Razorpay and Google check that the policy
      pages show who runs the service.
- [ ] `ALLOWED_EMAILS`: **delete it, or leave it empty**, to let anyone sign up. Keep it only for
      a closed test.
- [ ] Check `https://<your-domain>/api/health` shows `"signIn": true`.

## 3. The small account store (consent records, later Premium)

- [ ] **Vercel → Storage → Create database → Upstash for Redis** (free plan). Choose the region
      **Mumbai (ap-south-1)**, so data stays in India.
- [ ] Connect it to the **memory-book** project. Vercel adds `KV_REST_API_URL` and
      `KV_REST_API_TOKEN` by itself.
- [ ] Redeploy, sign in and agree to the privacy notice. In Upstash's **Data Browser** you should
      see one `account:…` entry holding only a coded number, the date and the notice version. No
      email, no names.

## 4. Google: permission and verification

So that families don't see "Google hasn't verified this app" and don't have to sign in again
every 7 days.

- [ ] **Data Access**: only `…/auth/drive.file` (plus `openid`, `email`, `profile`). **Remove**
      `drive.readonly` and `drive` if they're still listed. `drive.file` is a *non-sensitive*
      permission, so no paid security assessment is needed.
- [ ] **Google Picker API** enabled, with a key restricted to your website and the Picker API
      (README step 1c-2).
- [ ] **Branding**:
  - [ ] App name: *Memory Book*.
  - [ ] Support email.
  - [ ] App logo: upload `public/icons/icon-512.png`.
  - [ ] Home page: `https://<your-domain>`
  - [ ] Privacy policy: `https://<your-domain>/privacy`
  - [ ] Terms of service: `https://<your-domain>/terms`
  - [ ] Authorized domains: `<your-domain>`
  - [ ] Developer contact email.
- [ ] **Prove you own the domain**: Google asks you to verify it in **Google Search Console**
      (search.google.com/search-console). Add the domain and follow the DNS step.
- [ ] **Audience → Publish app** (from *Testing* to *In production*).
- [ ] **Verification centre → Submit for verification.** With only non-sensitive permissions,
      Google mainly checks your brand (name, logo, domain, privacy policy). It usually takes a
      few working days. If they ask why you need `drive.file`, use this:
      > Memory Book is a baby journal that stores each family's book (text and photos) in the
      > user's own Google Drive instead of on our servers. We use `drive.file` to create and update
      > the book's own folder and files, and to copy in photos the user explicitly picks with the
      > Google Picker. We can't see any other file in the user's Drive. Data is used only to show
      > the user their own book and is never shared, sold or used for advertising.
- [ ] If Google asks for a demo video, record your screen: sign in, the permission screen, adding
      a memory, the folder appearing in Drive, and Settings → Delete my account.
- [ ] After approval: sign in on a fresh account to check there's no warning screen.

## 5. Razorpay (Premium payments)

- [ ] Create a Razorpay account and complete **KYC** (PAN, bank account, business details). It
      takes a few days.
- [ ] In Razorpay's website-details form, give your domain and these pages, which Razorpay
      requires:
      `/privacy`, `/terms`, `/refunds` (cancellation & refund) and `/contact`. Pricing is shown on
      the home page.
- [ ] Use the **test keys** in Vercel's *Preview* environment and the **live keys** only in
      *Production*. Never put the secret key in a `NEXT_PUBLIC_` variable.
- [ ] Set up the webhook Razorpay should call. It's done with the Premium work, and Premium
      status is set only after the webhook's signature is checked.

## 6. Policies and the law (India, DPDP Act 2023 and Rules 2025)

- [ ] Read `/privacy`, `/terms`, `/refunds` and `/contact` on the live site, and fill in the
      operator name and address (step 2).
- [ ] **Have a lawyer read them once**, especially before taking payments. They're written in
      plain language to match how the app works, but they aren't legal advice.
- [ ] The grievance email (`sacheen501@gmail.com`) is one you check: reply within 7 days, and
      resolve within 30.
- [ ] Read `BREACH_RESPONSE.md` and keep the contacts (Data Protection Board, CERT-In) somewhere
      handy.
- [ ] If you change what data is collected, update `src/lib/consent.ts`
      (`CONSENT_VERSION` and the points). Everyone is then asked to agree again.

## 7. Monitoring

- [ ] **Uptime:** create a free monitor at UptimeRobot or Better Stack. Have it check
      `https://<your-domain>/api/health` every 5 minutes and email you if it's down.
- [ ] **Errors:** in **Vercel → Logs**, search for `client-error` once a week. Reports contain no
      names, words, emails or IDs.
- [ ] *(Optional)* Turn on **Vercel → Analytics (Web Analytics)**. It's privacy-friendly: no
      cookies, aggregate only. Don't add any other tracking.

## 8. Check on real devices before launch

The automated tests use a pretend Google Drive, so try these once with real accounts:

- [ ] Sign up with a new Google account: the explanation before Google, the permission screen,
      the privacy notice, creating the book and the first memory.
- [ ] **Choose photos from Google Drive** (needs step 2's picker settings), then **↻ Check for
      new photos**.
- [ ] Invite a second Google account: as *can view* (opens, can't write), then as *can add
      memories* (adds a page with a photo, which then appears in your Drive as your own copy).
- [ ] Android phone: install the app, then **Share → Memory Book** from Google Photos.
- [ ] iPhone: add a photo from the camera roll; on a computer, a `.heic` file from Drive.
- [ ] Download a PDF (A4 and square), and **Download everything**.
- [ ] Add a second child's book and switch between the two from the top bar.
- [ ] Delete a test account (keeping, then trashing, the book).

## 9. Test version (staging) and automatic checks

**The test version.** Every branch pushed to GitHub gets its own Vercel *Preview* address. It
shows a yellow **Test version** label and is hidden from search engines. Give it its own
settings so tests can never touch real families' data or real money:

- [ ] In **Vercel → Settings → Environment Variables**, set these for **Preview** only:
  - [ ] A different `AUTH_SECRET`.
  - [ ] Its own Google client (`AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`), made in Google Cloud as a
        second OAuth client. It can stay in *Testing*, with only your test accounts added.
  - [ ] Its own account store: a second Upstash database, connected to Preview only.
  - [ ] Razorpay **test** keys (step 5).
  - [ ] `ALLOWED_EMAILS` with just your test accounts.
- [ ] Try changes on the Preview address first; promote to Production only when they work.

**Automatic checks on GitHub.** Every change runs **Memory Book checks** (in GitHub → Actions):
type check, unit tests, a dependency vulnerability scan, a production build, and the full
end-to-end test against a pretend Google Drive. No secrets are needed for this.

- [ ] *(Recommended)* In **GitHub → Settings → Branches**, add a rule for your main branch:
      *Require status checks to pass* → **checks**. Then nothing broken can be merged.
- [ ] **Dependabot** suggests dependency updates every Monday as pull requests. Merge one only
      when its checks are green. Security fixes come straight away.
