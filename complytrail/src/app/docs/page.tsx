import Link from "next/link";
import { STALE_AFTER_DAYS } from "@/lib/constants";

type Section = { id: string; title: string; body: React.ReactNode };

const SECTIONS: Section[] = [
  {
    id: "overview",
    title: "Overview",
    body: (
      <>
        <p>
          ComplyTrail is a SOC 2 People Ops evidence tracker for early-stage companies. It covers the
          control family auditors spend the most back-and-forth on — onboarding, offboarding, access
          reviews, training, and policy acknowledgement — and gives each one a status, an owner, and a
          place to attach evidence.
        </p>
        <p>
          ComplyTrail is multi-tenant: every company that signs up gets its own completely isolated
          workspace. Nothing — controls, evidence, team members, settings — is ever shared across
          companies.
        </p>
      </>
    ),
  },
  {
    id: "getting-started",
    title: "Getting started",
    body: (
      <>
        <p>
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Creating an account
          </Link>{" "}
          always creates a brand-new workspace, and you become its first admin. There&apos;s no
          &quot;joining&quot; a workspace through the public sign-up form — that&apos;s intentional, so one
          company can never accidentally land inside another&apos;s data.
        </p>
        <p>
          To bring teammates into <em>your</em> workspace, go to{" "}
          <span className="font-medium">Settings → Team</span> and add them by name and email. ComplyTrail
          generates a one-time temporary password for you to relay to them directly (there&apos;s no email
          delivery in this version) — they can change it after signing in.
        </p>
      </>
    ),
  },
  {
    id: "controls",
    title: "Controls & evidence",
    body: (
      <>
        <p>
          The control checklist is organized into five categories: Onboarding, Offboarding, Access
          Review, Training, and Policy. Each control has a status —{" "}
          <span className="font-medium">Missing</span>, <span className="font-medium">In Progress</span>,
          or <span className="font-medium">Evidence Attached</span> — and an optional owner on your team.
        </p>
        <p>Evidence can be a file upload, a link to somewhere evidence already lives, or a written note.</p>
        <p>
          Evidence isn&apos;t permanent proof once attached — anything older than {STALE_AFTER_DAYS} days is
          flagged <span className="font-medium text-amber-700">Stale</span> on the checklist, the control
          page, and the gap report, since an auditor will ask for something more recent.
        </p>
      </>
    ),
  },
  {
    id: "gap-report",
    title: "Gap report",
    body: (
      <p>
        The gap report lists every control that needs attention right now — either missing evidence
        entirely, or evidence that&apos;s gone stale — alongside its owner and (if you&apos;ve set an audit
        date in Settings) how many days away your audit is. Use it as your working list, not the
        checklist.
      </p>
    ),
  },
  {
    id: "policy-assistant",
    title: "Policy drafting assistant",
    body: (
      <p>
        For a control that has no underlying written policy yet, ComplyTrail can draft one from a short
        questionnaire about how your team actually operates. The draft is a starting point — review and
        edit it before treating it as company policy. This feature requires an Anthropic API key to be
        configured; without one, the page explains that plainly rather than failing silently.
      </p>
    ),
  },
  {
    id: "trust-center",
    title: "Trust Center",
    body: (
      <p>
        Admins can turn on a public, read-only Trust Center page from{" "}
        <span className="font-medium">Settings → Trust Center</span>. It shows your overall and
        per-category compliance pass rate — nothing else. No evidence files, links, note content, or team
        member names are ever exposed on that page. It&apos;s meant to be shared with a prospect or
        customer during a security review, instead of a spreadsheet.
      </p>
    ),
  },
  {
    id: "team",
    title: "Team & roles",
    body: (
      <p>
        There are two roles: <span className="font-medium">Admin</span> (can add teammates, change the
        audit date, and toggle the Trust Center) and <span className="font-medium">Member</span> (can do
        everything else — update control status, attach evidence, draft policies). The first person to
        create a workspace is always its admin.
      </p>
    ),
  },
  {
    id: "faq",
    title: "FAQ",
    body: (
      <dl className="space-y-4">
        <div>
          <dt className="font-medium text-slate-900">Can my company and another company share a workspace?</dt>
          <dd className="mt-1 text-slate-600">
            No — every workspace is a fully separate tenant. If you need a second workspace, sign up again
            with a different email.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">Does ComplyTrail replace a real SOC 2 audit?</dt>
          <dd className="mt-1 text-slate-600">
            No. It helps you track and organize the People Ops side of your evidence ahead of one — it
            isn&apos;t a certification and doesn&apos;t talk to an auditor on your behalf.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-900">What counts as a SOC 2 framework here?</dt>
          <dd className="mt-1 text-slate-600">
            This version covers the People Ops control family only (onboarding, offboarding, access
            review, training, policy acknowledgement) — not the full SOC 2 Trust Services Criteria.
          </dd>
        </div>
      </dl>
    ),
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            ComplyTrail
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">
              Sign in
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-brand-600 px-3 py-1.5 font-medium text-white hover:bg-brand-700"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-5xl gap-10 px-4 py-10">
        <nav className="hidden w-48 shrink-0 md:block">
          <div className="sticky top-10 space-y-1 text-sm">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                {s.title}
              </a>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1 space-y-10">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Documentation</p>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">ComplyTrail Docs</h1>
          </div>

          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-10">
              <h2 className="mb-3 text-lg font-semibold text-slate-900">{s.title}</h2>
              <div className="space-y-3 text-sm leading-6 text-slate-700">{s.body}</div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
