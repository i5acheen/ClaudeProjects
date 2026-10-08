/**
 * Business details used across the site.
 *
 * Anything in [SQUARE BRACKETS] is a placeholder. Placeholders are highlighted
 * in yellow on the site, and `npm run build` fails in production while any
 * remain (unless ALLOW_PLACEHOLDERS is set). Contact details come from
 * environment variables so the same values are used everywhere.
 */

function envOr(value: string | undefined, placeholder: string): string {
  return value && value.trim() !== '' ? value.trim() : placeholder;
}

export const site = {
  name: 'Maharashtra Health Connect',
  /** Short name for tight spaces (logo, social cards). */
  shortName: 'Health Connect',
  url: envOr(process.env.NEXT_PUBLIC_SITE_URL, 'https://example.com').replace(/\/$/, ''),
  domain: envOr(process.env.NEXT_PUBLIC_SITE_URL, '[DOMAIN]')
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, ''),
  /** Digits only, with country code, e.g. 919876543210 */
  whatsapp: envOr(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, '[WHATSAPP NUMBER]'),
  /** As dialled, e.g. +919876543210 */
  phone: envOr(process.env.NEXT_PUBLIC_PHONE, '[PHONE]'),
  email: envOr(process.env.NEXT_PUBLIC_EMAIL, '[EMAIL]'),
  address: '[OFFICE ADDRESS]',
  /** Desk hours shown to visitors, e.g. "9 am to 9 pm, all days". */
  callbackHours: '[CALLBACK HOURS]',
  /** "We will call you within X working hours". */
  callbackWithinHours: '[X]',
  /** Districts served at launch (also the form dropdown). Edit names in all three languages. */
  districts: [
    { id: 'pune', en: 'Pune', mr: 'पुणे', hi: 'पुणे' },
    {
      id: 'chhatrapati-sambhajinagar',
      en: 'Chhatrapati Sambhajinagar (Aurangabad)',
      mr: 'छत्रपती संभाजीनगर (औरंगाबाद)',
      hi: 'छत्रपति संभाजीनगर (औरंगाबाद)',
    },
  ],
  /** Bump this whenever the privacy policy text changes. Stored with every consent. */
  privacyPolicyVersion: '2026-10-draft-1',
} as const;

export function isPlaceholder(value: string): boolean {
  return /^\[[A-Z]/.test(value);
}

export function telHref(): string {
  return isPlaceholder(site.phone)
    ? '#placeholder-phone'
    : `tel:${site.phone.replace(/[^\d+]/g, '')}`;
}

export function mailHref(): string {
  return isPlaceholder(site.email) ? '#placeholder-email' : `mailto:${site.email}`;
}
