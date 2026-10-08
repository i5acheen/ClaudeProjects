import { site, telHref } from '@/content/site';
import { factText } from '@/content/facts';
import type { I18n } from './i18n';
import { href } from './routes';
import type { ContactInfo, FormStrings } from '@/components/forms/shared';

/** Strings and contact details passed from server pages to the client forms. */
export function formProps(i18n: I18n, whatsappKey = 'default') {
  const { t, get, lang } = i18n;
  const strings = get<FormStrings>('forms');
  const contact: ContactInfo = {
    telHref: telHref(),
    phone: site.phone,
    privacyHref: href(lang, '/privacy'),
    helplinesTitle: t('common.officialHelplines'),
    helplines: [
      { number: factText('helplineNational', lang), label: t('common.helplineNationalLabel') },
      { number: factText('helplineState', lang), label: t('common.helplineStateLabel') },
    ],
    whatsappLabel: t('common.whatsapp'),
    callLabel: t('common.call'),
    whatsappMessage: t(`whatsappMessage.${whatsappKey}`),
  };
  return { strings, contact, lang };
}
