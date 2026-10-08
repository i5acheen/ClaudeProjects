export const locales = ['mr', 'hi', 'en'] as const;
export type Lang = (typeof locales)[number];
export const defaultLocale: Lang = 'mr';

export const localeNames: Record<Lang, string> = {
  mr: 'मराठी',
  hi: 'हिन्दी',
  en: 'English',
};

/** BCP 47 tags used for <html lang>, hreflang and Open Graph. */
export const localeTags: Record<Lang, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-IN',
};

export function isLang(value: string): value is Lang {
  return (locales as readonly string[]).includes(value);
}
