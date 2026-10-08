import type { Metadata } from 'next';
import { site } from '@/content/site';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { formProps } from '@/lib/form-props';
import { ContactButtons } from '@/components/ContactButtons';
import { Helplines } from '@/components/Helplines';
import { IndependenceNote } from '@/components/IndependenceNote';
import { PatientForm } from '@/components/forms/PatientForm';
import { PageHeader, Section } from '@/components/ui';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/get-help'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/get-help',
    title: t('getHelp.title'),
    description: t('getHelp.metaDescription'),
  });
}

export default async function GetHelpPage({ params }: PageProps<'/[lang]/get-help'>) {
  const i18n = await i18nFromParams(params);
  const { t, lang } = i18n;
  const fp = formProps(i18n);
  return (
    <>
      <PageHeader title={t('getHelp.title')} lead={t('getHelp.lead')} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-plain sm:p-8">
            <PatientForm
              {...fp}
              districts={site.districts.map((d) => ({ value: d.id, label: d[lang] }))}
              freeNote={t('forms.freeNote')}
              callbackPromise={t('forms.callbackPromise')}
            />
          </div>
          <aside className="space-y-6">
            <div className="card">
              <h2 className="text-xl font-bold">{t('getHelp.orTitle')}</h2>
              <p className="mt-1">{t('getHelp.orText')}</p>
              <ContactButtons i18n={i18n} showCallback={false} className="mt-4 [&>*]:w-full" />
            </div>
            <Helplines i18n={i18n} />
            <IndependenceNote i18n={i18n} />
          </aside>
        </div>
      </Section>
    </>
  );
}
