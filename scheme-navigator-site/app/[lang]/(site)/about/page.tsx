import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { site, telHref, mailHref } from '@/content/site';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { rich } from '@/lib/placeholders';
import { ContactButtons } from '@/components/ContactButtons';
import { BulletList, PageHeader, Section } from '@/components/ui';

export async function generateMetadata({ params }: PageProps<'/[lang]/about'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  return pageMetadata({
    lang,
    path: '/about',
    title: t('about.title'),
    description: t('about.metaDescription'),
  });
}

export default async function AboutPage({ params }: PageProps<'/[lang]/about'>) {
  const i18n = await i18nFromParams(params);
  const { t, get } = i18n;
  return (
    <>
      <PageHeader title={t('about.title')} lead={t('about.mission')} />
      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <section className="card">
            <h2 className="text-xl font-bold">{t('about.whatTitle')}</h2>
            <p className="mt-2">{t('about.what')}</p>
          </section>
          <section className="card card-warm">
            <h2 className="text-xl font-bold">{t('about.independenceTitle')}</h2>
            <div className="mt-3">
              <BulletList
                items={get<string[]>('about.independence')}
                icon={<ShieldCheck className="size-5" />}
              />
            </div>
          </section>
          <section className="card card-plain">
            <h2 className="text-xl font-bold">{t('about.areaTitle')}</h2>
            <p className="mt-2">{t('about.area')}</p>
          </section>
          <section className="card card-plain">
            <h2 className="text-xl font-bold">{t('about.teamTitle')}</h2>
            <p className="mt-2">{rich(t('about.team'))}</p>
          </section>
        </div>
      </Section>
      <Section title={t('common.contactUs')} className="border-t border-line">
        <dl className="grid gap-3 text-lg sm:grid-cols-2">
          <div>
            <dt className="font-bold">{t('common.phoneLabel')}</dt>
            <dd>
              <a href={telHref()} className="link">
                {rich(site.phone)}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-bold">{t('common.emailLabel')}</dt>
            <dd>
              <a href={mailHref()} className="link">
                {rich(site.email)}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-bold">{t('common.addressLabel')}</dt>
            <dd>{rich(site.address)}</dd>
          </div>
          <div>
            <dt className="font-bold">{t('common.hoursLabel')}</dt>
            <dd>{i18n.vars.callbackHours}</dd>
          </div>
        </dl>
        <ContactButtons i18n={i18n} className="mt-8" />
      </Section>
    </>
  );
}
