import Link from 'next/link';
import { site, telHref, mailHref } from '@/content/site';
import type { I18n } from '@/lib/i18n';
import { rich } from '@/lib/placeholders';
import { href } from '@/lib/routes';
import { factText } from '@/content/facts';
import { Logo } from './Logo';

export function SiteFooter({ i18n }: { i18n: I18n }) {
  const { t, lang, vars } = i18n;
  const cols = [
    {
      title: t('nav.patients'),
      links: [
        ['howItWorks', '/how-it-works'],
        ['schemes', '/schemes'],
        ['getHelp', '/get-help'],
        ['camps', '/camps'],
        ['faq', '/faq'],
      ],
    },
    {
      title: t('nav.organisation'),
      links: [
        ['about', '/about'],
        ['forHospitals', '/for-hospitals'],
        ['forPartners', '/for-partners'],
        ['report', '/report'],
      ],
    },
    {
      title: t('nav.legal'),
      links: [
        ['privacy', '/privacy'],
        ['terms', '/terms'],
        ['disclaimer', '/disclaimer'],
      ],
    },
  ];
  return (
    <footer className="mt-16 border-t border-line bg-mist pb-24 md:pb-0">
      <div className="container-x py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo name={site.name} />
            <p className="mt-4 font-semibold text-brand-800">{t('common.freeForPatients')}</p>
            <dl className="mt-4 space-y-1.5 text-base text-muted">
              <div>
                <dt className="inline font-semibold text-ink">{t('common.phoneLabel')}: </dt>
                <dd className="inline">
                  <a href={telHref()} className="link">
                    {rich(site.phone)}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{t('common.emailLabel')}: </dt>
                <dd className="inline">
                  <a href={mailHref()} className="link">
                    {rich(site.email)}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{t('common.addressLabel')}: </dt>
                <dd className="inline">{rich(site.address)}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{t('common.hoursLabel')}: </dt>
                <dd className="inline">{rich(site.callbackHours)}</dd>
              </div>
              <div>
                <dt className="inline font-semibold text-ink">{t('common.areaLabel')}: </dt>
                <dd className="inline">{vars.districts}</dd>
              </div>
            </dl>
          </div>
          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-base font-bold text-ink">{col.title}</h2>
              <ul className="mt-3 space-y-1">
                {col.links.map(([key, path]) => (
                  <li key={path}>
                    <Link
                      href={href(lang, path)}
                      className="inline-flex min-h-11 items-center text-base text-muted hover:text-ink hover:underline"
                    >
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-10 rounded-2xl border border-line bg-white p-4 text-base text-muted">
          <p>{rich(t('common.independenceLine'))}</p>
          <p className="mt-2">
            {t('common.officialHelplines')}:{' '}
            <a href={`tel:${factText('helplineNational', lang)}`} className="link">
              {factText('helplineNational', lang)}
            </a>{' '}
            ·{' '}
            <a href={`tel:${factText('helplineState', lang)}`} className="link">
              {factText('helplineState', lang)}
            </a>
          </p>
        </div>
        <p className="mt-6 text-sm text-muted">
          © {new Date().getFullYear()} {rich(site.name)}. {t('common.rightsReserved')}
        </p>
      </div>
    </footer>
  );
}
