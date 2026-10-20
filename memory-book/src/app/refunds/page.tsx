import { LegalPage } from "@/components/legal/LegalPage";
import { GRIEVANCE_EMAIL } from "@/lib/legal";
import { APP_NAME } from "@/content/marketing";

export const metadata = { title: `Refund and cancellation policy — ${APP_NAME}` };

export default function RefundsPage() {
  return (
    <LegalPage title="Refunds and cancellation" intro={<p>Clear and simple, so you can try Premium without worry.</p>}>
      <h2>Cancelling</h2>
      <p>
        You can cancel Premium at any time in Settings. You keep Premium until the end of the period you&rsquo;ve paid for, and
        you won&rsquo;t be charged again. Your book and everything in it stays yours either way.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>
          <b>Changed your mind?</b> Ask within 7 days of your first payment and we&rsquo;ll refund it in full.
        </li>
        <li>
          <b>Charged by mistake</b> (for example twice, or after cancelling)? We&rsquo;ll refund the extra charge in full.
        </li>
        <li>Renewals after the first period aren&rsquo;t refunded, but cancelling stops the next one.</li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Write to <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a> from the email you sign in with, and include the
        Razorpay payment reference if you have it. We reply within 3 working days. Approved refunds go back to the original payment
        method (UPI, card or bank) through Razorpay, usually within 5–7 working days.
      </p>
    </LegalPage>
  );
}
