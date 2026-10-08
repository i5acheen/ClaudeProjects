import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { ContactButtons } from '@/components/ContactButtons';
import { Helplines } from '@/components/Helplines';
import { JsonLd } from '@/components/JsonLd';
import { Faq, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }: PageProps<'/[lang]/faq'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/faq',
    title: t('faq.title'),
    description: t('faq.metaDescription'),
  });
}

export default async function FaqPage({ params }: PageProps<'/[lang]/faq'>) {
  const i18n = await i18nFromParams(params);
  const { t, get } = i18n;
  const items = get<{ q: string; a: string }[]>('faq.items');
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  };
  return (
    <>
      <PageHeader title={t('faq.title')} />
      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr]">
          <Faq items={items} />
          <aside className="space-y-6">
            <Helplines i18n={i18n} />
            <ContactButtons i18n={i18n} className="[&>*]:w-full" />
          </aside>
        </div>
      </Section>
      <JsonLd data={faqLd} />
    </>
  );
}
