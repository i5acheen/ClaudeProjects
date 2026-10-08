import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, FileText, ListOrdered, Users } from 'lucide-react';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { href, schemeKey, schemeSlugs, type SchemeSlug } from '@/lib/routes';
import { factText, factUrl, lastVerifiedFor, type FactKey } from '@/content/facts';
import { rich } from '@/lib/placeholders';
import { ContactButtons } from '@/components/ContactButtons';
import { Helplines } from '@/components/Helplines';
import { IndependenceNote } from '@/components/IndependenceNote';
import { BulletList, DoctorNote, Faq, PageHeader, Section } from '@/components/ui';

/** Facts each scheme page depends on — the oldest lastVerified date is shown. */
const schemeFacts: Record<SchemeSlug, FactKey[]> = {
  'pmjay-mjpjay': [
    'coverPerFamily',
    'procedureCount',
    'allFamiliesSince',
    'helplineNational',
    'helplineState',
    'linkPmjay',
    'linkJeevandayee',
  ],
  'vay-vandana': [
    'vayVandanaAge',
    'vayVandanaCover',
    'vayVandanaLaunched',
    'helplineNational',
    'linkBeneficiary',
  ],
  'charitable-hospitals': [
    'charityFreeBedsPercent',
    'charityConcessionBedsPercent',
    'charityCourtYear',
    'linkCharityCommissioner',
  ],
};

export function generateStaticParams() {
  return schemeSlugs.map((scheme) => ({ scheme }));
}
export const dynamicParams = false;

function isScheme(s: string): s is SchemeSlug {
  return (schemeSlugs as readonly string[]).includes(s);
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/schemes/[scheme]'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  const { scheme } = await params;
  if (!isScheme(scheme)) return {};
  const k = schemeKey[scheme];
  return pageMetadata({
    lang,
    path: `/schemes/${scheme}`,
    title: t(`schemes.${k}.metaTitle`),
    description: t(`schemes.${k}.metaDescription`),
  });
}

export default async function SchemePage({ params }: PageProps<'/[lang]/schemes/[scheme]'>) {
  const i18n = await i18nFromParams(params);
  const { scheme } = await params;
  if (!isScheme(scheme)) notFound();
  const { t, get, lang } = i18n;
  const k = schemeKey[scheme];
  const blocks = [
    { title: t('schemes.whoTitle'), items: get<string[]>(`schemes.${k}.who`), Icon: Users },
    {
      title: t('schemes.whatTitle'),
      items: get<string[]>(`schemes.${k}.what`),
      Icon: CheckCircle2,
    },
    { title: t('schemes.bringTitle'), items: get<string[]>(`schemes.${k}.bring`), Icon: FileText },
    { title: t('schemes.howTitle'), items: get<string[]>(`schemes.${k}.how`), Icon: ListOrdered },
  ];
  const faq = get<{ q: string; a: string }[]>(`schemes.${k}.faq`);
  const others = schemeSlugs.filter((s) => s !== scheme);

  return (
    <>
      <PageHeader
        eyebrow={t('nav.schemes')}
        title={t(`schemes.${k}.name`)}
        lead={t(`schemes.${k}.intro`)}
      >
        <p className="mt-5 inline-block rounded-xl bg-white px-4 py-2 text-base text-muted ring-1 ring-line">
          {rich(t('common.infoAsOf', { date: lastVerifiedFor(schemeFacts[scheme]) }))}
        </p>
      </PageHeader>
      <Section>
        <IndependenceNote i18n={i18n} className="mb-8" />
        <div className="grid gap-4 md:grid-cols-2">
          {blocks.map(({ title, items, Icon }) => (
            <section key={title} className="card card-plain">
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Icon className="size-6 text-brand-700" aria-hidden />
                {title}
              </h2>
              <div className="mt-4">
                <BulletList items={items} />
              </div>
            </section>
          ))}
        </div>
        {scheme === 'charitable-hospitals' && (
          <p className="mt-4">
            <a
              href={factUrl('linkCharityCommissioner')}
              className="link"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('schemes.charity.officialLink')} — {factText('linkCharityCommissioner', lang)}
            </a>
          </p>
        )}
        <div className="mt-6">
          <DoctorNote text={t('common.doctorDecides')} />
        </div>
      </Section>

      <Section title={t('schemes.helpTitle')} className="border-t border-line">
        <p className="max-w-2xl">{t('how.lead')}</p>
        <ContactButtons i18n={i18n} className="mt-6" />
      </Section>

      <Section title={t('schemes.faqTitle')}>
        <div className="max-w-3xl">
          <Faq items={faq} />
        </div>
      </Section>

      <Section title={t('schemes.officialTitle')}>
        <div className="grid gap-6 md:grid-cols-2">
          <Helplines i18n={i18n} />
          <div className="card">
            <h2 className="text-xl font-bold">{t('schemes.otherSchemes')}</h2>
            <ul className="mt-3 space-y-2">
              {others.map((s) => (
                <li key={s}>
                  <Link
                    href={href(lang, `/schemes/${s}`)}
                    className="link inline-flex min-h-11 items-center"
                  >
                    {t(`schemes.${schemeKey[s]}.name`)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>
    </>
  );
}
