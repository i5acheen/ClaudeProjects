import { notFound } from 'next/navigation';
import { getI18n } from '@/lib/i18n';
import { isLang } from '@/lib/i18n-config';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { StickyContactBar } from '@/components/StickyContactBar';

export default async function SiteLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const i18n = getI18n(lang);
  return (
    <>
      <SiteHeader i18n={i18n} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter i18n={i18n} />
      <StickyContactBar i18n={i18n} />
    </>
  );
}
