import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import { site, isPlaceholder } from '@/content/site';
import { getI18n } from '@/lib/i18n';
import { isLang, locales, localeTags } from '@/lib/i18n-config';
import { href } from '@/lib/routes';
import { Analytics } from '@/components/Analytics';
import { JsonLd } from '@/components/JsonLd';
import { SourceCapture } from '@/components/SourceCapture';
import '../globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0b6b63',
};

export async function generateMetadata({ params }: LayoutProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const { t } = getI18n(lang);
  return {
    metadataBase: new URL(site.url),
    title: { default: `${t('meta.homeTitle')} | ${site.name}`, template: `%s | ${site.name}` },
    description: t('meta.homeDescription'),
    applicationName: site.name,
    formatDetection: { telephone: false },
  };
}

export default async function RootLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const i18n = getI18n(lang);
  const { t } = i18n;

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${site.url}/#organization`,
    name: site.name,
    url: site.url,
    description: t('meta.homeDescription'),
    ...(isPlaceholder(site.phone) ? {} : { telephone: site.phone }),
    ...(isPlaceholder(site.email) ? {} : { email: site.email }),
    ...(isPlaceholder(site.address)
      ? {}
      : {
          address: {
            '@type': 'PostalAddress',
            streetAddress: site.address,
            addressRegion: 'Maharashtra',
            addressCountry: 'IN',
          },
        }),
    areaServed: site.districts.map((d) => ({ '@type': 'AdministrativeArea', name: d.en })),
    knowsLanguage: ['mr', 'hi', 'en'],
  };

  return (
    <html lang={localeTags[lang]} className={`${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh antialiased">
        <SourceCapture />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:font-semibold focus:text-ink focus:shadow-lg"
        >
          {t('nav.skip')}
        </a>
        {children}
        <JsonLd data={organization} />
        <Analytics
          text={t('consentBanner.text')}
          accept={t('consentBanner.accept')}
          decline={t('consentBanner.decline')}
          policyLabel={t('consentBanner.policy')}
          policyHref={href(lang, '/privacy')}
        />
      </body>
    </html>
  );
}
