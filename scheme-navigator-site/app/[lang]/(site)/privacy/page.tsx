import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { LegalPage, legalMetadata } from '@/components/LegalPage';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/privacy'>): Promise<Metadata> {
  return legalMetadata(await i18nFromParams(params), 'privacy');
}

export default async function PrivacyPage({ params }: PageProps<'/[lang]/privacy'>) {
  return <LegalPage i18n={await i18nFromParams(params)} doc="privacy" />;
}
