import type { Metadata } from 'next';
import { Check } from 'lucide-react';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { formProps } from '@/lib/form-props';
import { PartnerForm } from '@/components/forms/PartnerForm';
import { IndependenceNote } from '@/components/IndependenceNote';
import { BulletList, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/for-partners'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/for-partners',
    title: t('partners.metaTitle'),
    description: t('partners.metaDescription'),
  });
}

export default async function ForPartnersPage({ params }: PageProps<'/[lang]/for-partners'>) {
  const i18n = await i18nFromParams(params);
  const { t, get } = i18n;
  const check = <Check className="size-5" />;
  return (
    <>
      <PageHeader
        eyebrow={t('partners.eyebrow')}
        title={t('partners.title')}
        lead={t('partners.lead')}
      >
        <a href="#partner-form-title" className="btn btn-primary btn-lg mt-6">
          {t('partners.formTitle')}
        </a>
      </PageHeader>
      <Section>
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card card-warm">
            <h2 className="text-xl font-bold">{t('partners.problemTitle')}</h2>
            <div className="mt-3">
              <BulletList items={get<string[]>('partners.problem')} />
            </div>
          </section>
          <section className="card">
            <h2 className="text-xl font-bold">{t('partners.doTitle')}</h2>
            <div className="mt-3">
              <BulletList items={get<string[]>('partners.do')} icon={check} />
            </div>
          </section>
        </div>
      </Section>
      <Section title={t('partners.impactTitle')} lead={t('partners.impactLead')}>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {get<string[]>('partners.impact').map((item) => (
            <li key={item} className="card card-plain font-semibold">
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-base text-muted">{t('partners.impactNote')}</p>
      </Section>
      <Section tone="mist">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-plain sm:p-8">
            <p className="mb-4 text-muted">{t('partners.formLead')}</p>
            <PartnerForm
              {...formProps(i18n, 'partner')}
              title={t('partners.formTitle')}
              defaultOrg="csr"
            />
          </div>
          <IndependenceNote i18n={i18n} className="self-start" />
        </div>
      </Section>
    </>
  );
}
