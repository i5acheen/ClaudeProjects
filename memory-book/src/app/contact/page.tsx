import { LegalPage } from "@/components/legal/LegalPage";
import { GRIEVANCE_EMAIL, OPERATOR_ADDRESS, OPERATOR_NAME } from "@/lib/legal";
import { APP_NAME } from "@/content/marketing";

export const metadata = { title: `Contact — ${APP_NAME}` };

export default function ContactPage() {
  return (
    <LegalPage title="Contact us" intro={<p>A real person reads every message.</p>}>
      <h2>Email</h2>
      <p>
        <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a> — for help, feedback, privacy questions, refunds or complaints.
        We reply within 7 days (3 working days for payments).
      </p>

      <h2>Grievance officer</h2>
      <p>
        Privacy complaints under India&rsquo;s Digital Personal Data Protection Act go to our grievance contact at the same address:{" "}
        <a href={`mailto:${GRIEVANCE_EMAIL}`}>{GRIEVANCE_EMAIL}</a>. We aim to resolve them within 30 days.
      </p>

      <h2>Who runs {APP_NAME}</h2>
      <p>
        {OPERATOR_NAME}
        {OPERATOR_ADDRESS ? <><br />{OPERATOR_ADDRESS}</> : null}
      </p>
    </LegalPage>
  );
}
