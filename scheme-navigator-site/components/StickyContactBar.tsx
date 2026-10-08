import { Bot, Phone } from 'lucide-react';
import type { I18n } from '@/lib/i18n';
import { telHref } from '@/content/site';
import { WhatsAppLink } from './WhatsAppLink';

/** Mobile-only sticky bar: WhatsApp (opens the WhatsApp assistant bot) and Call. */
export function StickyContactBar({ i18n, src }: { i18n: I18n; src?: string }) {
  const { t } = i18n;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="grid grid-cols-2 gap-2 px-3 py-2">
        <WhatsAppLink
          message={t('whatsappMessage.default')}
          src={src}
          target="bot"
          className="btn btn-whatsapp !min-h-13 !px-3"
        >
          <Bot className="size-5" aria-hidden />
          {t('common.whatsappShort')}
        </WhatsAppLink>
        <a href={telHref()} className="btn btn-dark !min-h-13 !px-3">
          <Phone className="size-5" aria-hidden />
          {t('common.callShort')}
        </a>
      </div>
    </div>
  );
}
