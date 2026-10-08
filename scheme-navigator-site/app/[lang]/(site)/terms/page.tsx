import type { Metadata } from 'next';
import { i18nFromParams } from '@/lib/page';
import { LegalPage, legalMetadata } from '@/components/LegalPage';

export async function generateMetadata({ params }: PageProps<'/[lang]/terms'>): Promise<Metadata> {
  return legalMetadata(await i18nFromParams(params), 'terms');
}

export default async function TermsPage({ params }: PageProps<'/[lang]/terms'>) {
  return <LegalPage i18n={await i18nFromParams(params)} doc="terms" />;
}
