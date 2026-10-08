import Link from 'next/link';
import { site } from '@/content/site';
import type { I18n } from '@/lib/i18n';
import { href, mainNav, navHref } from '@/lib/routes';
import { Logo } from './Logo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { MobileMenu } from './MobileMenu';

export function SiteHeader({ i18n }: { i18n: I18n }) {
  const { t, lang } = i18n;
  const links = [
    { href: href(lang), label: t('nav.home') },
    ...mainNav.map((n) => ({ href: navHref(lang, n.path), label: t(`nav.${n.key}`) })),
    { href: href(lang, '/about'), label: t('nav.about') },
    { href: href(lang, '/report'), label: t('nav.report') },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 backdrop-blur-md">
      <div className="border-b border-line/70 bg-brand-50 sm:hidden">
        <div className="container-x flex items-center justify-between gap-2 py-1">
          <span className="text-sm font-semibold text-brand-800">
            {t('common.freeForPatients')}
          </span>
          <LanguageSwitcher lang={lang} label={t('nav.language')} compact />
        </div>
      </div>
      <div className="container-x relative flex min-h-16 items-center justify-between gap-3 py-2 sm:min-h-20">
        <Link href={href(lang)} className="flex min-h-12 items-center rounded-lg">
          <Logo name={site.name} />
        </Link>
        <nav aria-label={t('nav.mainNav')} className="hidden lg:block">
          <ul className="flex items-center gap-0.5">
            {mainNav.map((n) => (
              <li key={n.key}>
                <Link
                  href={navHref(lang, n.path)}
                  className="rounded-full px-3 py-2 text-[0.98rem] font-medium text-muted hover:text-ink"
                >
                  {t(`nav.${n.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSwitcher lang={lang} label={t('nav.language')} />
          </div>
          <Link
            href={href(lang, '/get-help')}
            className="btn btn-primary hidden !min-h-11 !px-5 !py-2 text-base lg:inline-flex"
          >
            {t('nav.getHelp')}
          </Link>
          <MobileMenu
            label={t('nav.menu')}
            links={links}
            footer={
              <div className="flex flex-col gap-3 pt-4">
                <LanguageSwitcher lang={lang} label={t('nav.language')} />
                <Link href={href(lang, '/get-help')} className="btn btn-primary w-full">
                  {t('nav.getHelp')}
                </Link>
              </div>
            }
          />
        </div>
      </div>
    </header>
  );
}
