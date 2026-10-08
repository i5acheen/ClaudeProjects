import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import type { Camp } from '@/content/content';
import { site } from '@/content/site';
import type { Lang } from '@/lib/i18n-config';
import { localeTags } from '@/lib/i18n-config';
import { href } from '@/lib/routes';
import { rich } from '@/lib/placeholders';

export function formatCampDate(camp: Camp, lang: Lang): string {
  const date = new Date(`${camp.date}T00:00:00+05:30`).toLocaleDateString(localeTags[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const time = camp.timeStart ? `, ${camp.timeStart}${camp.timeEnd ? `–${camp.timeEnd}` : ''}` : '';
  return date + time;
}

export function districtName(id: string, lang: Lang): string {
  return site.districts.find((d) => d.id === id)?.[lang] ?? id;
}

export function CampCard({ camp, lang, cta }: { camp: Camp; lang: Lang; cta: string }) {
  return (
    <article className="card card-plain flex h-full flex-col">
      <h3 className="text-xl font-bold">{rich(camp.title[lang])}</h3>
      <p className="mt-3 flex gap-2 text-base">
        <CalendarDays className="mt-1 size-5 shrink-0 text-brand-700" aria-hidden />
        {formatCampDate(camp, lang)}
      </p>
      <p className="mt-1 flex gap-2 text-base">
        <MapPin className="mt-1 size-5 shrink-0 text-brand-700" aria-hidden />
        <span>
          {rich(camp.place[lang])} · {districtName(camp.district, lang)}
        </span>
      </p>
      <div className="mt-auto pt-4">
        <Link href={href(lang, `/camps/${camp.slug}`)} className="btn btn-outline w-full sm:w-auto">
          {cta}
        </Link>
      </div>
    </article>
  );
}
