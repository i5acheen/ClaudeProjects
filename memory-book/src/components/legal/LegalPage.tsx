import { LEGAL_UPDATED } from "@/lib/legal";
import { SiteFooter } from "./SiteFooter";
import { BackButton } from "@/components/ui/BackButton";

/** A plain, readable page for policies. */
export function LegalPage({ title, intro, children }: { title: string; intro?: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="mb-4">
        <BackButton fallback="/" />
      </p>
      <article className="sheet legal leading-relaxed text-ink-soft">
        <h1 className="ui-h1">{title}</h1>
        <p className="mt-1 text-sm text-ink-faint">Last updated {LEGAL_UPDATED}</p>
        {intro && <div className="mt-4 text-lg">{intro}</div>}
        {children}
      </article>
      <SiteFooter />
    </main>
  );
}
