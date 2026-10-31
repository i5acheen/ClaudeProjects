export const metadata = { title: "Privacy policy — HealthConnect", robots: { index: true } };

/** Public privacy policy (required by Meta lead forms and WhatsApp). Placeholders in [brackets] must be completed and legally reviewed (CLAUDE.md Part C §9). */
export default function PrivacyPolicy() {
  return (
    <main className="prose mx-auto max-w-3xl space-y-4 p-6 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Privacy policy</h1>
      <p>
        <strong>[Organisation legal name]</strong>, Chhatrapati Sambhajinagar, Maharashtra (&quot;we&quot;) helps patients access treatment
        under MJPJAY and PM-JAY at empanelled hospitals. This policy explains how we process your personal data under the Digital Personal
        Data Protection Act, 2023.
      </p>
      <h2 className="text-lg font-semibold">What we collect</h2>
      <p>
        Name, phone number, age, district/taluka, the health problem you tell us about, whether you hold Aadhaar / ration / scheme cards,
        photos of documents you choose to send, and our WhatsApp conversation with you. We do not store your Aadhaar number as text.
      </p>
      <h2 className="text-lg font-semibold">Why</h2>
      <p>
        Only to check scheme eligibility, help you book a visit at an empanelled hospital and follow up until admission. With your consent
        we contact you on WhatsApp. An automated assistant may reply first; a human coordinator is always available — reply &quot;talk to a
        person&quot;.
      </p>
      <h2 className="text-lg font-semibold">Who sees it</h2>
      <p>
        Our coordinators; the partner hospital you are referred to (name, treatment and visit date only); service providers who host our
        systems in India (Supabase, Mumbai; Vercel, Mumbai) and an AI provider under paid API terms that do not allow training on your data.
        We never sell your data.
      </p>
      <h2 className="text-lg font-semibold">How long</h2>
      <p>
        Documents are deleted 90 days after admission or closure; other personal data is anonymised one year after closure, unless the law
        requires longer.
      </p>
      <h2 className="text-lg font-semibold">Your rights</h2>
      <p>
        You can ask for a copy of your data, correction or deletion, or withdraw consent at any time — reply STOP / थांबवा on WhatsApp to
        stop messages.
      </p>
      <h2 className="text-lg font-semibold">Grievance officer</h2>
      <p>[Name], [email], [phone], [address]. We respond within 30 days. You may also approach the Data Protection Board of India.</p>
      <p className="text-xs text-muted">Last updated: [date]</p>
    </main>
  );
}
