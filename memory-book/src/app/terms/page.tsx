import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { GRIEVANCE_EMAIL, OPERATOR_NAME } from "@/lib/legal";

export const metadata = { title: "Terms — Memory Book" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" intro={<p>The simple rules for using Memory Book. By creating a book, you agree to them.</p>}>
      <h2>The service</h2>
      <p>
        Memory Book ({OPERATOR_NAME}) lets you write a journal of your child&rsquo;s memories, keep it in your own Google Drive,
        share it with family you choose, and download it as a PDF.
      </p>

      <h2>Who can use it</h2>
      <p>You must be 18 or older and the parent or legal guardian of the child whose book you keep.</p>

      <h2>Your book is yours</h2>
      <ul>
        <li>You own everything you put in your book. It&rsquo;s stored in your Google Drive, under your control.</li>
        <li>You let Memory Book open and change those files only to provide the service to you and the family you invite.</li>
        <li>Only add photos and words you have the right to use, and only share with people you trust.</li>
      </ul>

      <h2>Fair use</h2>
      <ul>
        <li>Don&rsquo;t use Memory Book for anything illegal, harmful or abusive, or to store other people&rsquo;s content without permission.</li>
        <li>Don&rsquo;t try to break, overload or get around the app&rsquo;s security.</li>
      </ul>

      <h2>Google Drive</h2>
      <p>
        Your book depends on your Google account and Drive. Google&rsquo;s own terms apply to them. If your Drive is full or your
        account is closed, the app may not be able to save or show your book.
      </p>

      <h2>Plans and payment</h2>
      <p>
        Memory Book is free to start. Paid plans, when offered, are described in the app before you pay, are processed by
        Razorpay, and can be cancelled at any time. See the <Link href="/refunds">refund policy</Link>.
      </p>

      <h2>Our responsibility</h2>
      <p>
        We work hard to keep the app reliable and your book safe (including weekly backups in your Drive), but the service is
        provided &ldquo;as is&rdquo;. As far as the law allows, we aren&rsquo;t liable for indirect losses, and our total
        liability is limited to what you paid us in the last 12 months. Nothing here limits rights you have under Indian consumer
        law.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop at any time and delete your account in Settings; your book stays in your Drive unless you delete it. We may
        suspend accounts that break these terms, after telling you why where we can.
      </p>

      <h2>Changes and law</h2>
      <p>
        If these terms change in an important way, we&rsquo;ll tell you in the app. These terms are governed by the laws of India.
        Questions: <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
