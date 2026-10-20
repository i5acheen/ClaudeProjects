"use client";

import Link from "next/link";
import { CONSENT_POINTS, CONSENT_VERSION } from "@/lib/consent";

/** The privacy notice, short and plain, with the parent-or-guardian confirmation. */
export function ConsentNotice({ childName, agreed, onAgree }: { childName: string; agreed: boolean; onAgree: (agreed: boolean) => void }) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-[var(--paper)] p-4 text-sm text-ink-soft">
      <p className="ui-h3">Before you start: your child&rsquo;s privacy</p>
      <ul className="mt-2 list-disc space-y-1.5 pl-5">
        {CONSENT_POINTS.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <p className="mt-2">
        Full details:{" "}
        <Link href="/privacy" target="_blank" className="underline decoration-dotted underline-offset-4">
          Privacy policy
        </Link>{" "}
        ·{" "}
        <Link href="/terms" target="_blank" className="underline decoration-dotted underline-offset-4">
          Terms
        </Link>
      </p>
      <label className="mt-3 flex items-start gap-3 text-[0.95rem] text-ink">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
          checked={agreed}
          onChange={(e) => onAgree(e.target.checked)}
          required
        />
        <span>
          I&rsquo;m {childName.trim() ? `${childName.trim()}’s` : "this child’s"} parent or legal guardian, and I agree to Memory Book
          keeping our memories as described above.
        </span>
      </label>
      <p className="mt-2 text-xs text-ink-faint">Notice version {CONSENT_VERSION}</p>
    </div>
  );
}

/** Keeps a copy of the agreement on our side too (coded account number + date only). */
export function recordConsent() {
  return fetch("/api/account", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "consent", version: CONSENT_VERSION, guardian: true }),
  }).catch(() => undefined);
}

export const consentNow = () => ({ version: CONSENT_VERSION, at: new Date().toISOString(), guardian: true as const });
