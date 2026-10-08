import type { MetadataRoute } from 'next';
import { site } from '@/content/site';
import { camps } from '@/content/content';
import { locales, localeTags } from '@/lib/i18n-config';
import { schemeSlugs, staticPaths } from '@/lib/routes';

/** All public pages in all three languages, with hreflang alternates. Landing pages (ads) are excluded. */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    ...staticPaths,
    ...schemeSlugs.map((s) => `/schemes/${s}`),
    ...camps.map((c) => `/camps/${c.slug}`),
  ];
  return paths.flatMap((path) =>
    locales.map((lang) => ({
      url: `${site.url}/${lang}${path}`,
      changeFrequency: 'weekly' as const,
      priority: path === '' ? 1 : path.startsWith('/schemes') || path === '/get-help' ? 0.8 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          locales.map((l) => [localeTags[l], `${site.url}/${l}${path}`]),
        ),
      },
    })),
  );
}
