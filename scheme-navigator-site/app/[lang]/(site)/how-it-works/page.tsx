import type { Metadata } from 'next';
import { Building2 } from 'lucide-react';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { ContactButtons } from '@/components/ContactButtons';
import { IndependenceNote } from '@/components/IndependenceNote';
import { DoctorNote, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/how-it-works'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/how-it-works',
    title: t('how.title'),
    description: t('meta.howDescription'),
  });
}

export default async function HowItWorksPage({ params }: PageProps<'/[lang]/how-it-works'>) {
  const i18n = await i18nFromParams(params);
  const { t, get } = i18n;
  const steps = get<{ title: string; text: string }[]>('how.steps');
  return (
    <>
      <PageHeader title={t('how.title')} lead={t('how.lead')} />
      <Section>
        <ol className="relative max-w-3xl space-y-4">
          {steps.map((step, i) => (
            <li key={step.title} className="relative flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-700 text-lg font-bold text-white">
                  {i + 1}
                </span>
                {i < steps.length - 1 && (
                  <span aria-hidden className="mt-1 w-0.5 flex-1 bg-brand-200" />
                )}
              </div>
              <div className="pb-4">
                <h2 className="text-xl font-bold">{step.title}</h2>
                <p className="mt-1 text-muted">{step.text}</p>
              </div>
            </li>
          ))}
          <li className="flex gap-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-warm-600 text-white">
              <Building2 className="size-5" aria-hidden />
            </span>
            <div className="card card-warm flex-1">
              <h2 className="text-xl font-bold">{t('how.handoverTitle')}</h2>
              <p className="mt-1">{t('how.handoverText')}</p>
            </div>
          </li>
        </ol>
        <div className="mt-8 max-w-3xl space-y-4">
          <DoctorNote text={t('common.doctorDecides')} />
          <div className="card">
            <h2 className="text-xl font-bold">{t('how.freeTitle')}</h2>
            <p className="mt-1">{t('how.freeText')}</p>
          </div>
        </div>
        <ContactButtons i18n={i18n} className="mt-8" />
        <IndependenceNote i18n={i18n} className="mt-8 max-w-3xl" />
      </Section>
    </>
  );
}
