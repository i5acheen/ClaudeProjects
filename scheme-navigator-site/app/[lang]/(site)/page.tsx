import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  ClipboardCheck,
  FileCheck2,
  HandHeart,
  Landmark,
  ShieldCheck,
  Users,
  UserRound,
} from 'lucide-react';
import { getI18n } from '@/lib/i18n';
import { isLang } from '@/lib/i18n-config';
import { pageMetadata } from '@/lib/metadata';
import { href, schemeKey, schemeSlugs } from '@/lib/routes';
import { rich } from '@/lib/placeholders';
import { upcomingCamps } from '@/content/content';
import { ContactButtons } from '@/components/ContactButtons';
import { CampCard } from '@/components/CampCard';
import { IndependenceNote } from '@/components/IndependenceNote';
import { Section } from '@/components/ui';

export const revalidate = 3600;

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return pageMetadata({
    lang,
    path: '',
    title: t('meta.homeTitle'),
    description: t('meta.homeDescription'),
  });
}

const stepIcons = [ClipboardCheck, FileCheck2, Building2];
const whoIcons = [Users, UserRound, HandHeart];
const schemeIcons = [ShieldCheck, UserRound, Landmark];

export default async function HomePage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const i18n = getI18n(lang);
  const { t, get } = i18n;
  const steps = get<{ title: string; text: string }[]>('home.steps');
  const who = get<{ title: string; text: string }[]>('home.who');
  const camps = upcomingCamps().slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white">
        <div className="container-x pt-10 pb-10 sm:pt-20 sm:pb-16">
          <p className="eyebrow">{rich(t('home.eyebrow'))}</p>
          <h1 className="mt-3 max-w-4xl text-[2.1rem] font-bold tracking-tight text-ink sm:text-6xl">
            {t('home.title')}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-muted sm:text-xl">{t('home.lead')}</p>
          <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-warm-100 px-4 py-2 font-semibold text-warm-800">
            <BadgeIndianRupee className="size-5 shrink-0" aria-hidden />
            {t('home.freeNote')}
          </p>
          <ContactButtons i18n={i18n} className="mt-8" />
        </div>

        {/* Trust bar */}
        <div className="border-y border-line bg-white">
          <ul className="container-x grid gap-3 py-5 sm:grid-cols-3">
            {[t('common.freeForPatients'), t('common.independent'), t('common.neverAskMoney')].map(
              (item) => (
                <li key={item} className="flex items-center gap-3 font-semibold">
                  <ShieldCheck className="size-6 shrink-0 text-brand-700" aria-hidden />
                  {item}
                </li>
              ),
            )}
          </ul>
        </div>
      </section>

      {/* Three steps */}
      <Section title={t('home.stepsTitle')}>
        <ol className="grid gap-4 md:grid-cols-3">
          {steps.map((step, i) => {
            const Icon = stepIcons[i] ?? ClipboardCheck;
            return (
              <li key={step.title} className="card">
                <div className="flex items-center gap-3">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 ring-1 ring-brand-200">
                    <Icon className="size-6" aria-hidden />
                  </span>
                  <span className="text-sm font-bold text-brand-700">{i + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold">{step.title}</h3>
                <p className="mt-1 text-muted">{step.text}</p>
              </li>
            );
          })}
        </ol>
        <Link
          href={href(lang, '/how-it-works')}
          className="link mt-6 inline-flex min-h-12 items-center gap-1"
        >
          {t('nav.howItWorks')} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Section>

      {/* Schemes */}
      <Section
        title={t('home.schemesTitle')}
        lead={t('home.schemesLead')}
        className="border-t border-line"
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {schemeSlugs.map((slug, i) => {
            const Icon = schemeIcons[i];
            const k = schemeKey[slug];
            return (
              <li key={slug}>
                <Link
                  href={href(lang, `/schemes/${slug}`)}
                  className="card card-plain group flex h-full flex-col transition hover:border-brand-600"
                >
                  <Icon className="size-8 text-brand-700" aria-hidden />
                  <h3 className="mt-3 text-xl font-bold group-hover:underline">
                    {t(`schemes.${k}.name`)}
                  </h3>
                  <p className="mt-2 text-muted">{t(`schemes.${k}.short`)}</p>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 font-semibold text-brand-700">
                    {t('common.learnMore')} <ArrowRight className="size-4" aria-hidden />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Who we help */}
      <Section title={t('home.whoTitle')}>
        <ul className="grid gap-4 md:grid-cols-3">
          {who.map((w, i) => {
            const Icon = whoIcons[i] ?? Users;
            return (
              <li key={w.title} className="card card-warm">
                <Icon className="size-8 text-warm-700" aria-hidden />
                <h3 className="mt-3 text-xl font-bold">{w.title}</h3>
                <p className="mt-1 text-muted">{w.text}</p>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Camps */}
      <Section
        title={t('home.campsTitle')}
        lead={t('home.campsLead')}
        className="border-t border-line"
      >
        {camps.length ? (
          <ul className="grid gap-4 md:grid-cols-3">
            {camps.map((camp) => (
              <li key={camp.slug}>
                <CampCard camp={camp} lang={lang} cta={t('camps.details')} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="card card-plain">{t('home.noCamps')}</p>
        )}
        <Link
          href={href(lang, '/camps')}
          className="link mt-6 inline-flex min-h-12 items-center gap-1"
        >
          {t('home.allCamps')} <ArrowRight className="size-4" aria-hidden />
        </Link>
      </Section>

      {/* Money warning */}
      <Section>
        <div className="card card-warm sm:p-8">
          <h2 className="text-2xl font-bold">{t('home.moneyTitle')}</h2>
          <p className="mt-2 max-w-3xl">{t('home.moneyText')}</p>
          <Link href={href(lang, '/report')} className="btn btn-dark mt-5">
            {t('home.moneyCta')}
          </Link>
        </div>
      </Section>

      {/* Final CTA */}
      <Section>
        <div className="rounded-[2rem] bg-brand-800 p-6 text-white sm:p-10">
          <h2 className="text-2xl font-bold sm:text-3xl">{t('home.ctaTitle')}</h2>
          <p className="mt-2 max-w-2xl text-brand-100">{t('home.ctaText')}</p>
          <Link
            href={href(lang, '/get-help')}
            className="btn btn-lg mt-6 bg-white text-brand-800 hover:bg-brand-50"
          >
            {t('common.requestCallback')}
          </Link>
        </div>
        <IndependenceNote i18n={i18n} className="mt-8" />
      </Section>
    </>
  );
}
