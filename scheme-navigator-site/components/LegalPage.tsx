import type { Metadata } from 'next';
import type { I18n } from '@/lib/i18n';
import { pageMetadata } from '@/lib/metadata';
import { rich } from '@/lib/placeholders';
import { PageHeader, Section } from './ui';

type Doc = 'privacy' | 'terms' | 'disclaimer';

export function legalMetadata(i18n: I18n, doc: Doc): Metadata {
  const { t, lang } = i18n;
  const title = t(`legal.${doc}.title`);
  return pageMetadata({
    lang,
    path: `/${doc}`,
    title,
    description: t('meta.legalDescription', { page: title }),
  });
}

export function LegalPage({ i18n, doc }: { i18n: I18n; doc: Doc }) {
  const { t, get } = i18n;
  const sections = get<{ h: string; p: string }[]>(`legal.${doc}.sections`);
  return (
    <>
      <PageHeader title={t(`legal.${doc}.title`)}>
        <p className="mt-4 inline-block rounded-xl bg-warm-100 px-4 py-2 font-semibold text-warm-800">
          {t('common.draftLegal')}
        </p>
        {doc === 'privacy' && (
          <p className="mt-3 text-base text-muted">{t('legal.privacy.updated')}</p>
        )}
      </PageHeader>
      <Section>
        <div className="max-w-3xl space-y-8">
          {sections.map((s) => (
            <section key={s.h}>
              <h2 className="text-xl font-bold">{s.h}</h2>
              <p className="mt-2 text-muted">{rich(s.p)}</p>
            </section>
          ))}
        </div>
      </Section>
    </>
  );
}
