/**
 * EVERY scheme fact, number, helpline and official link used on the site.
 *
 * Pages read facts only from this file. To change a fact, edit it here, update
 * `lastVerified`, and the whole site updates. In translated text, a fact is
 * used as {factName}, e.g. "Cover up to {coverPerFamily} per family".
 *
 * Before launch: check each fact against its `source` and replace
 * '[LAST VERIFIED DATE]' with the date you checked (e.g. '2026-10-15').
 */
import type { Lang } from '@/lib/i18n-config';

export type Fact = {
  /** Machine value (number, phone digits, URL…). */
  value: string | number;
  /** How it reads in each language. Falls back to String(value). */
  display?: Partial<Record<Lang, string>>;
  /** Official or best available source. */
  source: string;
  /** ISO date the fact was last checked against the source. */
  lastVerified: string;
  note?: string;
};

const LAST_VERIFIED = '[LAST VERIFIED DATE]';

export const facts = {
  // ── Official links ──────────────────────────────────────────────
  linkPmjay: {
    value: 'https://pmjay.gov.in',
    display: { en: 'pmjay.gov.in', mr: 'pmjay.gov.in', hi: 'pmjay.gov.in' },
    source: 'https://pmjay.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  linkBeneficiary: {
    value: 'https://beneficiary.nha.gov.in',
    display: {
      en: 'beneficiary.nha.gov.in',
      mr: 'beneficiary.nha.gov.in',
      hi: 'beneficiary.nha.gov.in',
    },
    source: 'https://beneficiary.nha.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  linkJeevandayee: {
    value: 'https://www.jeevandayee.gov.in',
    display: { en: 'jeevandayee.gov.in', mr: 'jeevandayee.gov.in', hi: 'jeevandayee.gov.in' },
    source: 'https://www.jeevandayee.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  linkCharityCommissioner: {
    value: 'https://charity.maharashtra.gov.in',
    display: {
      en: 'charity.maharashtra.gov.in',
      mr: 'charity.maharashtra.gov.in',
      hi: 'charity.maharashtra.gov.in',
    },
    source: 'https://charity.maharashtra.gov.in',
    lastVerified: LAST_VERIFIED,
  },

  // ── Helplines ───────────────────────────────────────────────────
  helplineNational: {
    value: '14555',
    source: 'https://pmjay.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'Ayushman Bharat PM-JAY national call centre (also for Vay Vandana).',
  },
  helplineState: {
    value: '155388',
    source: 'https://www.jeevandayee.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'MJPJAY / State Health Assurance Society toll-free helpline.',
  },

  // ── PM-JAY + MJPJAY (combined in Maharashtra) ───────────────────
  coverPerFamily: {
    value: 500000,
    display: { en: '₹5 lakh', mr: '₹5 लाख', hi: '₹5 लाख' },
    source: 'https://www.jeevandayee.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'Per family per year, cashless, family floater.',
  },
  procedureCount: {
    value: 1356,
    display: { en: '1,356', mr: '1,356', hi: '1,356' },
    source: 'https://www.jeevandayee.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  allFamiliesSince: {
    value: '2024-07',
    display: { en: 'July 2024', mr: 'जुलै 2024', hi: 'जुलाई 2024' },
    source: 'https://www.jeevandayee.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'Coverage extended to all Maharashtra families. VERIFY on the official portal.',
  },

  // ── Ayushman Vay Vandana ────────────────────────────────────────
  vayVandanaAge: {
    value: 70,
    display: { en: '70', mr: '70', hi: '70' },
    source: 'https://beneficiary.nha.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  vayVandanaCover: {
    value: 500000,
    display: { en: '₹5 lakh', mr: '₹5 लाख', hi: '₹5 लाख' },
    source: 'https://pmjay.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'Per year. Seniors in families already covered get a top-up for themselves.',
  },
  vayVandanaLaunched: {
    value: '2024-10-29',
    display: { en: '29 October 2024', mr: '29 ऑक्टोबर 2024', hi: '29 अक्टूबर 2024' },
    source: 'https://pmjay.gov.in',
    lastVerified: LAST_VERIFIED,
  },

  // ── Charitable trust hospitals ──────────────────────────────────
  charityFreeBedsPercent: {
    value: 10,
    display: { en: '10%', mr: '10%', hi: '10%' },
    source: 'https://charity.maharashtra.gov.in',
    lastVerified: LAST_VERIFIED,
    note: 'Maharashtra Public Trusts Act and 2004 Bombay High Court ruling.',
  },
  charityConcessionBedsPercent: {
    value: 10,
    display: { en: '10%', mr: '10%', hi: '10%' },
    source: 'https://charity.maharashtra.gov.in',
    lastVerified: LAST_VERIFIED,
  },
  charityCourtYear: {
    value: 2004,
    display: { en: '2004', mr: '2004', hi: '2004' },
    source: 'https://charity.maharashtra.gov.in',
    lastVerified: LAST_VERIFIED,
  },
} satisfies Record<string, Fact>;

export type FactKey = keyof typeof facts;

export function factText(key: FactKey, lang: Lang): string {
  const fact: Fact = facts[key];
  return fact.display?.[lang] ?? String(fact.value);
}

export function factUrl(key: FactKey): string {
  return String(facts[key].value);
}

/** All facts as {name: display text} for message interpolation. */
export function factVars(lang: Lang): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const key of Object.keys(facts) as FactKey[]) vars[key] = factText(key, lang);
  return vars;
}

/** The oldest lastVerified date among the given facts (shown on scheme pages). */
export function lastVerifiedFor(keys: FactKey[]): string {
  const dates = keys.map((k) => facts[k].lastVerified);
  const placeholder = dates.find((d) => d.startsWith('['));
  if (placeholder) return placeholder;
  return dates.sort()[0] ?? '';
}
