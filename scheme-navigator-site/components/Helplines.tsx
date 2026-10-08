import { Phone } from 'lucide-react';
import type { I18n } from '@/lib/i18n';
import { factText, factUrl } from '@/content/facts';

export function Helplines({ i18n, tone = 'plain' }: { i18n: I18n; tone?: 'plain' | 'warm' }) {
  const { t, lang } = i18n;
  const lines = [
    { label: t('common.helplineNationalLabel'), number: factText('helplineNational', lang) },
    { label: t('common.helplineStateLabel'), number: factText('helplineState', lang) },
  ];
  return (
    <div className={`card ${tone === 'warm' ? 'card-warm' : 'card-plain'}`}>
      <h2 className="text-xl font-bold">{t('common.officialHelplines')}</h2>
      <ul className="mt-3 space-y-3">
        {lines.map((l) => (
          <li key={l.number}>
            <a href={`tel:${l.number}`} className="group flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-line">
                <Phone className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block text-2xl font-bold tracking-wide text-ink group-hover:underline">
                  {l.number}
                </span>
                <span className="block text-base text-muted">{l.label}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-base text-muted">
        {t('common.officialLinks')}:{' '}
        {(['linkPmjay', 'linkBeneficiary', 'linkJeevandayee'] as const).map((k, i) => (
          <span key={k}>
            {i > 0 && ' · '}
            <a href={factUrl(k)} className="link" target="_blank" rel="noopener noreferrer">
              {factText(k, lang)}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
