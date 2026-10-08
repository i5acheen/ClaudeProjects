import type { Lang } from './i18n-config';

export const schemeSlugs = ['pmjay-mjpjay', 'vay-vandana', 'charitable-hospitals'] as const;
export type SchemeSlug = (typeof schemeSlugs)[number];

/** Message namespace for each scheme page. */
export const schemeKey: Record<SchemeSlug, 'pmjay' | 'vay' | 'charity'> = {
  'pmjay-mjpjay': 'pmjay',
  'vay-vandana': 'vay',
  'charitable-hospitals': 'charity',
};

/** Static pages (path after /<lang>) — used by the sitemap and navigation. */
export const staticPaths = [
  '',
  '/how-it-works',
  '/schemes',
  '/get-help',
  '/camps',
  '/for-hospitals',
  '/for-partners',
  '/about',
  '/faq',
  '/report',
  '/privacy',
  '/terms',
  '/disclaimer',
] as const;

export function href(lang: Lang, path = ''): string {
  return `/${lang}${path}`;
}

export const mainNav = [
  { key: 'howItWorks', path: '/how-it-works' },
  { key: 'schemes', path: '/schemes' },
  { key: 'camps', path: '/camps' },
  { key: 'faq', path: '/faq' },
  { key: 'forHospitals', path: '/for-hospitals' },
  { key: 'forPartners', path: '/for-partners' },
] as const;
