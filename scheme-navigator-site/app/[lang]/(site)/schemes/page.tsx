import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { href, schemeKey, schemeSlugs } from '@/lib/routes';
import { Helplines } from '@/components/Helplines';
import { IndependenceNote } from '@/components/IndependenceNote';
import { PageHeader, Section } from '@/components/ui';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/schemes'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/schemes',
    title: t('schemes.title'),
    description: t('meta.schemesDescription'),
  });
}

export default async function SchemesPage({ params }: PageProps<'/[lang]/schemes'>) {
  const i18n = await i18nFromParams(params);
  const { t, lang } = i18n;
  return (
    <>
      <PageHeader title={t('schemes.title')} lead={t('schemes.lead')} />
      <Section>
        <ul className="grid gap-4 md:grid-cols-3">
          {schemeSlugs.map((slug) => {
            const k = schemeKey[slug];
            return (
              <li key={slug}>
                <Link
                  href={href(lang, `/schemes/${slug}`)}
                  className="card card-plain group flex h-full flex-col transition hover:border-brand-600"
                >
                  <h2 className="text-xl font-bold group-hover:underline">
                    {t(`schemes.${k}.name`)}
                  </h2>
                  <p className="mt-2 text-muted">{t(`schemes.${k}.short`)}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 font-semibold text-brand-700">
                    {t('common.learnMore')} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <Helplines i18n={i18n} />
          <IndependenceNote i18n={i18n} className="self-start" />
        </div>
      </Section>
    </>
  );
}
