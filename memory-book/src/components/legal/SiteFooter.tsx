import Link from "next/link";
import { GRIEVANCE_EMAIL } from "@/lib/legal";

/** Links every page should offer: policies and a way to reach a person. */
export function SiteFooter({ className = "" }: { className?: string }) {
  return (
    <footer className={`mt-8 text-center text-sm text-ink-faint ${className}`}>
      <nav aria-label="About Memory Book" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/refunds" className="hover:text-ink">Refunds</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
      </nav>
      <p className="mt-2">
        Questions or complaints:{" "}
        <a href={`mailto:${GRIEVANCE_EMAIL}`} className="underline decoration-dotted underline-offset-4 hover:text-ink">
          {GRIEVANCE_EMAIL}
        </a>
      </p>
    </footer>
  );
}
