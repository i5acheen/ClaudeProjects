import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { upcomingCamps } from '@/content/content';
import { CampCard } from '@/components/CampCard';
import { ContactButtons } from '@/components/ContactButtons';
import { DoctorNote, PageHeader, Section } from '@/components/ui';

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<'/[lang]/camps'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/camps',
    title: t('camps.title'),
    description: t('camps.metaDescription'),
  });
}

export default async function CampsPage({ params }: PageProps<'/[lang]/camps'>) {
  const i18n = await i18nFromParams(params);
  const { t, lang } = i18n;
  const camps = upcomingCamps();
  return (
    <>
      <PageHeader title={t('camps.title')} lead={t('camps.lead')} />
      <Section title={t('camps.upcoming')}>
        {camps.length ? (
          <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {camps.map((camp) => (
              <li key={camp.slug}>
                <CampCard camp={camp} lang={lang} cta={t('camps.details')} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="card card-plain">
            <p>{t('camps.none')}</p>
            <ContactButtons i18n={i18n} showCallback={false} className="mt-4" />
          </div>
        )}
        <div className="mt-8 max-w-3xl space-y-3">
          <p className="card font-semibold text-brand-800">{t('camps.freeNote')}</p>
          <DoctorNote text={t('camps.doctorNote')} />
        </div>
      </Section>
    </>
  );
}
