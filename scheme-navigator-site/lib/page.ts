import { notFound } from 'next/navigation';
import { getI18n } from './i18n';
import { isLang } from './i18n-config';

/** Resolve the [lang] param for a page (404 for unknown languages). */
export async function i18nFromParams(params: Promise<{ lang: string }>) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return getI18n(lang);
}
