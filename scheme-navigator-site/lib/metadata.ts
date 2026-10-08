import type { Metadata } from 'next';
import { site } from '@/content/site';
import { locales, localeTags, type Lang } from './i18n-config';

/** Per-page metadata with canonical URL and hreflang alternates for all three languages. */
export function pageMetadata({
  lang,
  path,
  title,
  description,
  noindex = false,
}: {
  lang: Lang;
  /** Path after /<lang>, e.g. "/faq" ("" for home). */
  path: string;
  title: string;
  description: string;
  noindex?: boolean;
}): Metadata {
  const languages: Record<string, string> = {};
  for (const l of locales) languages[localeTags[l]] = `/${l}${path}`;
  languages['x-default'] = `/mr${path}`;
  return {
    title,
    description,
    alternates: { canonical: `/${lang}${path}`, languages },
    openGraph: {
      type: 'website',
      siteName: site.name,
      title,
      description,
      url: `/${lang}${path}`,
      locale: localeTags[lang].replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title, description },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}
