import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { formProps } from '@/lib/form-props';
import { rich } from '@/lib/placeholders';
import { telHref } from '@/content/site';
import { Helplines } from '@/components/Helplines';
import { ReportForm } from '@/components/forms/ReportForm';
import { PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }: PageProps<'/[lang]/report'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/report',
    title: t('report.title'),
    description: t('report.metaDescription'),
  });
}

export default async function ReportPage({ params }: PageProps<'/[lang]/report'>) {
  const i18n = await i18nFromParams(params);
  const { t } = i18n;
  return (
    <>
      <PageHeader title={t('report.title')} lead={t('report.lead')}>
        <p className="mt-4 text-lg">
          <a href={telHref()} className="link">
            {rich(t('report.callText'))}
          </a>
        </p>
      </PageHeader>
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div className="card card-plain sm:p-8">
            <ReportForm {...formProps(i18n, 'report')} />
          </div>
          <aside className="space-y-4">
            <p className="font-semibold">{t('report.officialText')}</p>
            <Helplines i18n={i18n} tone="warm" />
          </aside>
        </div>
      </Section>
    </>
  );
}
