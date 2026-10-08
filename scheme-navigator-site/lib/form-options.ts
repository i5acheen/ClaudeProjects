/** Option ids shared by the forms (client) and validation (server). Labels live in messages/*.json. */
export const WHO_OPTIONS = ['self', 'family', 'senior'] as const;
export const HELP_OPTIONS = [
  'check-coverage',
  'scheme-card',
  'find-hospital',
  'doctor-advised',
  'other',
] as const;
export const HAS_CARD_OPTIONS = ['yes', 'no', 'not-sure'] as const;
export const CALLBACK_OPTIONS = ['morning', 'afternoon', 'evening', 'any'] as const;
export const ORG_OPTIONS = ['hospital', 'csr', 'ngo', 'other'] as const;
export const ISSUE_OPTIONS = [
  'asked-money-our-name',
  'hospital-asked-money',
  'impersonation',
  'website',
  'other',
] as const;

/** Indian mobile: optional +91 / 91 / 0 prefix, then 10 digits starting 6–9. */
export function normaliseMobile(input: string): string | null {
  const digits = input
    .replace(/[\s()-]/g, '')
    .replace(/^\+?91(?=\d{10}$)/, '')
    .replace(/^0(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export type SourceFields = {
  src: string;
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_term: string;
  utm_content: string;
  landing_page: string;
  page: string;
};

export const SOURCE_KEYS: (keyof SourceFields)[] = [
  'src',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'landing_page',
  'page',
];
