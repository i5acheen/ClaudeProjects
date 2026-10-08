import type { ReactNode } from 'react';
import { rich } from '@/lib/placeholders';

export function PageHeader({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}) {
  return (
    <section className="bg-gradient-to-b from-brand-50 to-white">
      <div className="container-x pt-10 pb-8 sm:pt-16 sm:pb-12">
        {eyebrow && <p className="eyebrow">{rich(eyebrow)}</p>}
        <h1 className="mt-2 max-w-3xl text-[2rem] font-bold tracking-tight text-ink sm:text-5xl">{rich(title)}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-muted sm:text-xl">{rich(lead)}</p>}
        {children}
      </div>
    </section>
  );
}

export function Section({
  title,
  lead,
  children,
  className = '',
  id,
}: {
  title?: string;
  lead?: string;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`container-x py-8 sm:py-12 ${className}`}>
      {title && <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{rich(title)}</h2>}
      {lead && <p className="mt-2 max-w-2xl text-muted">{rich(lead)}</p>}
      <div className={title || lead ? 'mt-6' : ''}>{children}</div>
    </section>
  );
}

export function BulletList({ items, icon }: { items: string[]; icon?: ReactNode }) {
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="mt-1.5 shrink-0 text-brand-700" aria-hidden>
            {icon ?? '●'}
          </span>
          <span>{rich(item)}</span>
        </li>
      ))}
    </ul>
  );
}

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-line rounded-2xl border border-line bg-white">
      {items.map((item, i) => (
        <details key={i} className="group p-0">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-lg font-semibold">
            <span>{rich(item.q)}</span>
            <span
              aria-hidden
              className="text-2xl leading-none text-brand-700 transition group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="px-4 pb-4 text-muted">{rich(item.a)}</p>
        </details>
      ))}
    </div>
  );
}

export function DoctorNote({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border-l-4 border-warm-600 bg-warm-50 p-4 text-base text-warm-800">
      {text}
    </p>
  );
}
