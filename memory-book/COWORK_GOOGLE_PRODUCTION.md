# Cowork task: take Google sign-in to "In production"

Paste everything below the line into Claude Cowork (with Claude in Chrome connected and signed in to
the Google account that owns the Memory Book Google Cloud project). It needs your browser, because
these settings live in Google Cloud Console, not in the code.

---

Help me publish the Google sign-in for my web app **Memory Book** (live at
https://memory-book-lovat.vercel.app) from *Testing* to *In production*, and submit it for Google's
brand verification. While it's in Testing, only 100 people can ever sign in. Work in my browser at
https://console.cloud.google.com, in the project that holds the Memory Book OAuth client. Ask me
before you click anything that publishes, submits or deletes, and stop to ask if you're unsure
which project is the right one. Never show or copy any client secret.

1. **Google Auth Platform → Data Access (scopes).** Only these must be listed: `openid`, `email`,
   `profile` and `https://www.googleapis.com/auth/drive.file`. If `drive.readonly` or `drive` is
   listed, tell me and remove it after I agree. (`drive.file` is a non-sensitive scope, so no paid
   security assessment is needed.)
2. **Branding.** Check and fill in, showing me each value before saving:
   - App name: Memory Book
   - User support email and developer contact email: my email
   - App logo: the 512×512 icon, which can be downloaded from
     https://memory-book-lovat.vercel.app/icons/icon-512.png
   - Home page: https://memory-book-lovat.vercel.app
   - Privacy policy: https://memory-book-lovat.vercel.app/privacy
   - Terms of service: https://memory-book-lovat.vercel.app/terms
   - Authorised domains: the domain of the home page. If I have my own domain by now, use that
     instead everywhere, and tell me if it still needs proving in Google Search Console
     (https://search.google.com/search-console). Note: Google may not accept `vercel.app` as an
     authorised domain for verification. If so, tell me; I'll need my own domain first.
3. **Clients.** Open the Memory Book web client and confirm the authorised redirect URI includes
   `https://<home page domain>/api/auth/callback/google`. Don't change anything else.
4. **Audience → Publish app** (Testing → In production). Ask me first.
5. **Verification centre → Submit for verification**, if Google offers it. If it asks why the app
   needs `drive.file`, use:
   > Memory Book is a baby journal that stores each family's book (text and photos) in the user's
   > own Google Drive instead of on our servers. We use drive.file to create and update the book's
   > own folder and files, and to copy in photos the user explicitly picks with the Google Picker.
   > We can't see any other file in the user's Drive. Data is used only to show the user their own
   > book and is never shared, sold or used for advertising.
   If it asks for a demo video, stop and tell me what it needs.
6. **APIs & Services → Google Drive API → Quotas.** Tell me the current "Queries per minute" limits.
   Don't request a change; just report them.
7. Finish with a short summary: what was already correct, what you changed, what's still waiting
   (for example Google's review, usually a few working days) and anything I need to do myself.
