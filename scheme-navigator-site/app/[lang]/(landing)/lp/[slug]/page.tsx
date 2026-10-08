import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, MessageCircle, Phone } from 'lucide-react';
import { getLandingPage, landingPages } from '@/content/content';
import { site, telHref } from '@/content/site';
import { interpolate } from '@/lib/i18n';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { formProps } from '@/lib/form-props';
import { rich } from '@/lib/placeholders';
import { Logo } from '@/components/Logo';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { SourceCapture } from '@/components/SourceCapture';
import { WhatsAppLink } from '@/components/WhatsAppLink';
import { IndependenceNote } from '@/components/IndependenceNote';
import { PatientForm } from '@/components/forms/PatientForm';

export const dynamicParams = false;

export function generateStaticParams() {
  return landingPages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/lp/[slug]'>): Promise<Metadata> {
  const { lang, vars } = await i18nFromParams(params);
  const page = getLandingPage((await params).slug);
  if (!page) return {};
  return pageMetadata({
    lang,
    path: `/lp/${page.slug}`,
    title: page.headline[lang],
    description: interpolate(page.subhead[lang], vars),
    noindex: true,
  });
}

/** Campaign landing page: no navigation, one goal (form / WhatsApp / call). */
export default async function LandingPage({ params }: PageProps<'/[lang]/lp/[slug]'>) {
  const i18n = await i18nFromParams(params);
  const { t, lang, vars } = i18n;
  const page = getLandingPage((await params).slug);
  if (!page) notFound();
  const fp = formProps(i18n);
  const districts = site.districts.map((d) => ({ value: d.id, label: d[lang] }));
  if (page.district)
    districts.sort((a, b) => Number(b.value === page.district) - Number(a.value === page.district));

  return (
    <>
      <SourceCapture defaultSrc={page.src} />
      <header className="border-b border-line bg-white">
        <div className="container-x flex min-h-16 flex-wrap items-center justify-between gap-2 py-2">
          <Logo name={site.name} />
          <LanguageSwitcher lang={lang} label={t('nav.language')} compact />
        </div>
      </header>
      <main id="main" tabIndex={-1} className="outline-none">
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="container-x grid gap-10 py-10 lg:grid-cols-[1fr_1fr] lg:py-16">
            <div>
              <p className="eyebrow">{t('landing.trust')}</p>
              <h1 className="mt-3 text-[2rem] font-bold tracking-tight sm:text-5xl">
                {page.headline[lang]}
              </h1>
              <p className="mt-4 text-lg text-muted sm:text-xl">
                {interpolate(page.subhead[lang], vars)}
              </p>
              <ul className="mt-6 space-y-3">
                {page.points[lang].map((p) => (
                  <li key={p} className="flex items-center gap-3 text-lg font-semibold">
                    <Check className="size-6 shrink-0 text-brand-700" aria-hidden />
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <WhatsAppLink
                  message={t('whatsappMessage.default')}
                  src={page.src}
                  className="btn btn-whatsapp btn-lg"
                >
                  <MessageCircle className="size-5" aria-hidden />
                  {t('common.whatsapp')}
                </WhatsAppLink>
                <a href={telHref()} className="btn btn-dark btn-lg">
                  <Phone className="size-5" aria-hidden />
                  {t('common.call')}
                </a>
              </div>
              <p className="mt-6 text-base text-muted">{t('common.doctorDecides')}</p>
            </div>
            <div className="card card-plain sm:p-8">
              <PatientForm
                {...fp}
                title={t('landing.formTitle')}
                districts={districts}
                freeNote={t('forms.freeNote')}
                callbackPromise={t('forms.callbackPromise')}
              />
            </div>
          </div>
        </section>
        <div className="container-x pb-10">
          <IndependenceNote i18n={i18n} />
          <p className="mt-4 text-sm text-muted">
            © {new Date().getFullYear()} {rich(site.name)} ·{' '}
            <a className="link" href={`/${lang}/privacy`}>
              {t('nav.privacy')}
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
