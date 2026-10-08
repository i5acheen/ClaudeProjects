'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { locales, localeNames, type Lang } from '@/lib/i18n-config';

export function LanguageSwitcher({
  lang,
  label,
  compact = false,
}: {
  lang: Lang;
  label: string;
  compact?: boolean;
}) {
  const pathname = usePathname() ?? `/${lang}`;
  const rest = pathname.replace(/^\/(mr|hi|en)(?=\/|$)/, '');
  return (
    <nav aria-label={label} className={`flex items-center rounded-full bg-white ${compact ? 'p-0.5' : 'border border-line p-1'}`}>
      {locales.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest}`}
          hrefLang={l}
          lang={l}
          aria-current={l === lang ? 'true' : undefined}
          className={`flex ${compact ? 'min-h-11 px-2 text-[0.9rem]' : 'min-h-10 px-2.5 text-[0.95rem]'} min-w-10 items-center justify-center rounded-full leading-snug font-semibold ${
            l === lang ? 'bg-brand-700 text-white' : 'text-muted hover:text-ink'
          }`}
        >
          {localeNames[l]}
        </Link>
      ))}
    </nav>
  );
}
