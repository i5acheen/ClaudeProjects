export const metadata = { title: "Terms — HealthConnect", robots: { index: true } };

export default function Terms() {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6 text-sm leading-6">
      <h1 className="text-2xl font-semibold">Terms of service</h1>
      <p>
        Our coordination service is free for patients. We are not a hospital and do not provide medical advice, diagnosis or treatment.
        Eligibility for MJPJAY / PM-JAY is decided by the scheme and the hospital, not by us; we cannot guarantee free treatment.
      </p>
      <p>In an emergency, go to the nearest hospital or call 108.</p>
      <p>
        By submitting a form or messaging us you agree to be contacted about your enquiry. See our{" "}
        <a className="underline" href="/privacy-policy">
          privacy policy
        </a>
        . Contact: [email / phone]. Governing law: India; courts at Chhatrapati Sambhajinagar.
      </p>
      <p className="text-xs text-muted">[Placeholders must be completed and reviewed by a lawyer before launch.]</p>
    </main>
  );
}
