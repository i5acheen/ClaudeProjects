import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { LegalPage, legalMetadata } from '@/components/LegalPage';

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/disclaimer'>): Promise<Metadata> {
  return legalMetadata(await i18nFromParams(params), 'disclaimer');
}

export default async function DisclaimerPage({ params }: PageProps<'/[lang]/disclaimer'>) {
  return <LegalPage i18n={await i18nFromParams(params)} doc="disclaimer" />;
}
