import type { Metadata } from 'next';
import { Check, Megaphone, UserCheck } from 'lucide-react';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { formProps } from '@/lib/form-props';
import { rich } from '@/lib/placeholders';
import { PartnerForm } from '@/components/forms/PartnerForm';
import { IndependenceNote } from '@/components/IndependenceNote';
import { BulletList, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/for-hospitals'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/for-hospitals',
    title: t('hospitals.metaTitle'),
    description: t('hospitals.metaDescription'),
  });
}

const offerIcons = [UserCheck, Megaphone];

export default async function ForHospitalsPage({ params }: PageProps<'/[lang]/for-hospitals'>) {
  const i18n = await i18nFromParams(params);
  const { t, get } = i18n;
  const offers = get<{ title: string; text: string }[]>('hospitals.offers');
  const check = <Check className="size-5" />;
  return (
    <>
      <PageHeader
        eyebrow={t('hospitals.eyebrow')}
        title={t('hospitals.title')}
        lead={t('hospitals.lead')}
      >
        <a href="#partner-form-title" className="btn btn-primary btn-lg mt-6">
          {t('hospitals.formTitle')}
        </a>
      </PageHeader>
      <Section title={t('hospitals.offerTitle')}>
        <div className="grid gap-4 md:grid-cols-2">
          {offers.map((o, i) => {
            const Icon = offerIcons[i] ?? UserCheck;
            return (
              <article key={o.title} className="card">
                <Icon className="size-8 text-brand-700" aria-hidden />
                <h3 className="mt-3 text-xl font-bold">{o.title}</h3>
                <p className="mt-2 text-muted">{o.text}</p>
              </article>
            );
          })}
        </div>
      </Section>
      <Section>
        <div className="grid gap-4 md:grid-cols-3">
          <section className="card card-warm">
            <h2 className="text-xl font-bold">{t('hospitals.feesTitle')}</h2>
            <div className="mt-3">
              <BulletList items={get<string[]>('hospitals.fees')} icon={check} />
            </div>
          </section>
          <section className="card card-plain">
            <h2 className="text-xl font-bold">{t('hospitals.rulesTitle')}</h2>
            <div className="mt-3">
              <BulletList items={get<string[]>('hospitals.rules')} icon={check} />
            </div>
          </section>
          <section className="card card-plain">
            <h2 className="text-xl font-bold">{t('hospitals.reportTitle')}</h2>
            <div className="mt-3">
              <BulletList items={get<string[]>('hospitals.report')} icon={check} />
            </div>
          </section>
        </div>
        <p className="mt-6 text-base text-muted">{rich(t('hospitals.partnerPlaceholder'))}</p>
      </Section>
      <Section tone="mist">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-plain sm:p-8">
            <p className="mb-4 text-muted">{t('hospitals.formLead')}</p>
            <PartnerForm
              {...formProps(i18n, 'hospital')}
              title={t('hospitals.formTitle')}
              defaultOrg="hospital"
            />
          </div>
          <IndependenceNote i18n={i18n} className="self-start" />
        </div>
      </Section>
    </>
  );
}
