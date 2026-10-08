import campsData from './camps.json';
import landingData from './landing-pages.json';
import type { Lang } from '@/lib/i18n-config';

type Localised<T = string> = Record<Lang, T>;

export type Camp = {
  slug: string;
  src: string;
  date: string;
  timeStart?: string;
  timeEnd?: string;
  district: string;
  title: Localised;
  place: Localised;
  screenings: Localised<string[]>;
  bring: Localised<string[]>;
  organisedWith?: string;
  contactPhone?: string;
  mapUrl?: string;
};

export type LandingPage = {
  slug: string;
  src: string;
  scheme: 'pmjay-mjpjay' | 'vay-vandana' | 'charitable-hospitals' | 'general';
  district?: string;
  headline: Localised;
  subhead: Localised;
  points: Localised<string[]>;
};

export const camps = campsData.camps as Camp[];
export const landingPages = landingData.pages as LandingPage[];

/** Today in India (camps are listed until the end of their day, IST). */
export function todayIST(): string {
  return new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
}

export function upcomingCamps(): Camp[] {
  const today = todayIST();
  return camps.filter((c) => c.date >= today).sort((a, b) => a.date.localeCompare(b.date));
}

export function getCamp(slug: string): Camp | undefined {
  return camps.find((c) => c.slug === slug);
}

export function getLandingPage(slug: string): LandingPage | undefined {
  return landingPages.find((p) => p.slug === slug);
}

export function isPastCamp(camp: Camp): boolean {
  return camp.date < todayIST();
}
