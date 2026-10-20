import { LegalPage } from "@/components/legal/LegalPage";
import { GRIEVANCE_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME } from "@/lib/legal";

export const metadata = { title: "Privacy policy — Memory Book" };

/** The privacy policy (also the link on Google's sign-in screen). Written in plain language on purpose. */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Your memories stay yours"
      intro={
        <p>
          Memory Book is a baby journal for parents. Your child&rsquo;s photos and stories are kept in{" "}
          <b>your own Google Drive</b> — not on our servers. This page explains exactly what is kept, where, and what you can do
          about it. It&rsquo;s written to meet India&rsquo;s Digital Personal Data Protection Act, 2023 and its Rules.
        </p>
      }
    >
      <h2>Who we are</h2>
      <p>
        Memory Book is run by {OPERATOR_NAME}
        {OPERATOR_ADDRESS ? `, ${OPERATOR_ADDRESS}` : ""}. For anything about your data, write to{" "}
        <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a> (our grievance contact).
      </p>

      <h2>What is kept, and where</h2>
      <ul>
        <li>
          <b>In your Google Drive</b>, in a folder called <i>Memory Book – (your child&rsquo;s name)</i>: your child&rsquo;s name and
          date of birth, the book&rsquo;s title and style, every memory&rsquo;s words, dates and tags, height and weight notes, the
          photos, and weekly backups. You can open, download, move or delete this folder at any time. Family you invite can see
          it through Google Drive&rsquo;s own sharing.
        </li>
        <li>
          <b>On our side — only this:</b> a coded account number made from your email (it can&rsquo;t be turned back into your
          email), the date you agreed to this notice, and, if you upgrade, your plan and payment reference numbers. Never your
          child&rsquo;s details, memories or photos.
        </li>
        <li>
          <b>In your browser</b>: your Google sign-in is kept in an encrypted cookie, and a copy of the book and small versions of
          photos are kept so it opens quickly and works offline. These stay on your device. <i>Sign out</i> removes them.
        </li>
        <li>
          <b>Payments</b> (Premium) are handled by Razorpay. We never see or keep your card or UPI details.
        </li>
        <li>
          <b>Error reports</b>: if something breaks, the app sends a short report (what went wrong and where in our code), with
          names, quoted text, emails, IDs and links removed first. Our hosting provider (Vercel) keeps ordinary server logs (such
          as IP address and time) for a short time to keep the service safe.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <p>Only to make and show your book, keep it safe and backed up, let the family you choose see it, and run your plan.</p>
      <ul>
        <li>No ads, no tracking, no profiling, and no selling or sharing of anything.</li>
        <li>Nothing about your child is used to analyse behaviour or to show targeted content.</li>
        <li>Photos and words travel straight between your browser and Google Drive; they never pass through our servers.</li>
      </ul>

      <h2>Children&rsquo;s data and your consent</h2>
      <p>
        Memory Book is used by parents and guardians, not by children. When you start a book, you confirm you are the
        child&rsquo;s parent or legal guardian and agree to this notice. You can withdraw your consent at any time by deleting
        your account (Settings → <i>Delete my account</i>): we then stop using your data, delete our record and cancel the
        app&rsquo;s access to your Google account. Your book stays in your Drive unless you choose to delete it too.
      </p>

      <h2>The Google permission we ask for</h2>
      <p>
        Only <code>drive.file</code>: the app can see and change only the files it creates, and photos or books you pick yourself
        in Google&rsquo;s own window. It can&rsquo;t see anything else in your Drive. You can remove the app&rsquo;s access at any
        time at <a href="https://myaccount.google.com/permissions">myaccount.google.com/permissions</a>. Memory Book&rsquo;s use
        of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
        including the Limited Use requirements.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li>
          <b>See and download everything</b>: Settings → <i>Download everything</i>, or open the folder in your Drive.
        </li>
        <li>
          <b>Correct</b> anything in the app, at any time.
        </li>
        <li>
          <b>Delete</b>: Settings → <i>Delete my account</i>. You choose whether your book folder stays in your Drive or goes to the
          Drive bin.
        </li>
        <li>
          <b>Complain</b> or ask anything: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>. We reply within 7 days and
          aim to resolve within 30. If you&rsquo;re not satisfied, you can approach the Data Protection Board of India.
        </li>
        <li>
          <b>Nominate</b> someone to act for you if you&rsquo;re unable to: tell us by email.
        </li>
      </ul>

      <h2>How long things are kept</h2>
      <ul>
        <li>Your book: as long as you keep it in your Drive — it&rsquo;s yours.</li>
        <li>Our account record: until you delete your account (payment records may be kept as long as tax law requires).</li>
        <li>Error reports and server logs: up to 30 days.</li>
      </ul>

      <h2>Security and breaches</h2>
      <p>
        We use Google&rsquo;s smallest Drive permission, strict browser security rules, encryption for the sign-in cookie, and no
        public sharing links. If a breach ever affects your data, we will tell you and the Data Protection Board of India without
        delay (within 72 hours of learning of it), along with what happened and what we&rsquo;re doing about it.
      </p>

      <h2>Changes</h2>
      <p>If this notice changes, the app will show you the new version and ask you to agree again.</p>
    </LegalPage>
  );
}
