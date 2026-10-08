import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CalendarDays, ExternalLink, MapPin, Phone } from 'lucide-react';
import { camps, getCamp, isPastCamp } from '@/content/content';
import { site } from '@/content/site';
import { i18nFromParams } from '@/lib/page';
import { pageMetadata } from '@/lib/metadata';
import { rich } from '@/lib/placeholders';
import { districtName, formatCampDate } from '@/components/CampCard';
import { ContactButtons } from '@/components/ContactButtons';
import { JsonLd } from '@/components/JsonLd';
import { BulletList, DoctorNote, PageHeader, Section } from '@/components/ui';

export const dynamicParams = false;
export const revalidate = 3600;

export function generateStaticParams() {
  return camps.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/camps/[slug]'>): Promise<Metadata> {
  const { t, lang } = await i18nFromParams(params);
  const camp = getCamp((await params).slug);
  if (!camp) return {};
  return pageMetadata({
    lang,
    path: `/camps/${camp.slug}`,
    title: `${camp.title[lang].replace(/\[[^\]]*\]\s*/g, '')} — ${formatCampDate(camp, lang)}`,
    description: t('camps.metaDescription'),
  });
}

export default async function CampPage({ params }: PageProps<'/[lang]/camps/[slug]'>) {
  const i18n = await i18nFromParams(params);
  const { t, lang } = i18n;
  const camp = getCamp((await params).slug);
  if (!camp) notFound();
  const isPast = isPastCamp(camp);
  const shortUrl = `${site.domain}/c/${camp.slug}`;

  const event = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: camp.title.en.replace(/\[[^\]]*\]\s*/g, ''),
    startDate: `${camp.date}T${camp.timeStart ?? '09:00'}:00+05:30`,
    ...(camp.timeEnd ? { endDate: `${camp.date}T${camp.timeEnd}:00+05:30` } : {}),
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    isAccessibleForFree: true,
    location: {
      '@type': 'Place',
      name: camp.place.en,
      address: `${camp.place.en}, Maharashtra, India`,
    },
    organizer: { '@id': `${site.url}/#organization` },
  };

  return (
    <>
      <PageHeader eyebrow={t('camps.title')} title={camp.title[lang]}>
        {isPast && (
          <p className="mt-4 rounded-xl bg-warm-100 p-3 font-semibold text-warm-800">
            {t('camps.past')}
          </p>
        )}
      </PageHeader>
      <Section>
        <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            <dl className="card card-plain space-y-4">
              <div className="flex gap-3">
                <CalendarDays className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden />
                <div>
                  <dt className="font-bold">{t('camps.when')}</dt>
                  <dd>{formatCampDate(camp, lang)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden />
                <div>
                  <dt className="font-bold">{t('camps.where')}</dt>
                  <dd>
                    {rich(camp.place[lang])} · {districtName(camp.district, lang)}
                    {camp.mapUrl && (
                      <>
                        <br />
                        <a
                          href={camp.mapUrl}
                          className="link inline-flex min-h-11 items-center gap-1"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {t('camps.map')} <ExternalLink className="size-4" aria-hidden />
                          <span className="sr-only">{t('common.opensNewTab')}</span>
                        </a>
                      </>
                    )}
                  </dd>
                </div>
              </div>
              {camp.organisedWith && (
                <div>
                  <dt className="font-bold">{t('camps.organisedWith')}</dt>
                  <dd>{rich(camp.organisedWith)}</dd>
                </div>
              )}
              {camp.contactPhone && (
                <div className="flex gap-3">
                  <Phone className="mt-1 size-6 shrink-0 text-brand-700" aria-hidden />
                  <div>
                    <dt className="font-bold">{t('camps.contact')}</dt>
                    <dd>
                      <a href={`tel:${camp.contactPhone}`} className="link">
                        {camp.contactPhone}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
            </dl>
            <section className="card">
              <h2 className="text-xl font-bold">{t('camps.screened')}</h2>
              <div className="mt-3">
                <BulletList items={camp.screenings[lang]} />
              </div>
            </section>
            <section className="card card-warm">
              <h2 className="text-xl font-bold">{t('camps.bring')}</h2>
              <div className="mt-3">
                <BulletList items={camp.bring[lang]} />
              </div>
            </section>
            <p className="font-semibold text-brand-800">{t('camps.freeNote')}</p>
            <DoctorNote text={t('camps.doctorNote')} />
          </div>
          <aside className="space-y-6">
            <div className="card card-plain">
              <ContactButtons i18n={i18n} src={camp.src} className="[&>*]:w-full" />
            </div>
            <p className="text-base text-muted">
              {t('camps.shortLink')}: <span className="font-mono">{rich(shortUrl)}</span>
            </p>
          </aside>
        </div>
      </Section>
      <JsonLd data={event} />
    </>
  );
}
