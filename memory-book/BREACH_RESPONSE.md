# If something goes wrong: data breach plan

A short, plain plan for the day you hope never comes. Keep it where you can find it.

**Responsible person:** the app's owner (contact: sacheen501@gmail.com).
**Legal basis:** India's Digital Personal Data Protection Act 2023 and DPDP Rules 2025. You must tell
the **Data Protection Board of India** and **every affected person** about a personal data breach. Aim
to do it **within 72 hours** of finding out; the Board's detailed report is due within 72 hours too.

## What counts as a breach here

- Someone who shouldn't have had it got access to a family's book, photos or account record. For
  example: a bug, a leaked key, a hacked admin account, or a book shared publicly by mistake.
- Our account store (coded IDs, consent dates and plans) or our logs leaked.
- The Google sign-in keys (`AUTH_SECRET`, `AUTH_GOOGLE_SECRET`) or the payment keys leaked.

Remember what we hold. Photos and memories live in each family's own Google Drive, not with us. A
breach on our side can only expose our small account records, unless the app itself is tricked into
misusing a family's Google access.

## Step by step

1. **Contain (first hour).**
   - Rotate any leaked secret in Vercel → Settings → Environment Variables, then redeploy:
     - `AUTH_SECRET` (this signs everyone out);
     - the Google client secret (Google Cloud → Clients → reset secret);
     - the Razorpay keys.
   - If the app itself is at fault, roll back to the last good deployment (Vercel → Deployments →
     *Promote* an older one), or pause the project.
   - If books were shared publicly, the owner's app removes public links the next time it's opened.
     Also tell affected owners to open their book.
2. **Understand (first day).** Note what happened, when it started and stopped, which families are
   affected, and what data was involved. Keep Vercel logs, emails and screenshots.
3. **Tell the Data Protection Board (within 72 hours).** Use the Board's online form. Include:
   - what happened, and when;
   - what kind of data, and roughly how many people;
   - the likely effects on them;
   - what you have done and will do;
   - who to contact.
4. **Tell affected families (as soon as possible, within 72 hours).** Send a plain email covering:
   - what happened;
   - what it means for them;
   - what you've done;
   - what they can do (for example, check their Drive folder's sharing, or remove the app at
     myaccount.google.com/permissions);
   - how to reach you.
5. **Fix and follow up.**
   - Fix the cause and add a test so it can't happen again.
   - Write a short note of what was learned.
   - Update `SECURITY_AUDIT.md`.
   - Within 72 hours, send the Board the detailed report: the facts, the cause, the measures taken
     and the people informed.

## Contacts to have ready

- Data Protection Board of India: dpb.gov.in (check the current breach-reporting address there).
- CERT-In (cyber incidents must also be reported to CERT-In within 6 hours): cert-in.org.in, incident@cert-in.org.in.
- Vercel support, Google Cloud support, Razorpay support.
