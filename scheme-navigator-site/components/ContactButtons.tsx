import Link from 'next/link';
import { MessageCircle, Phone, PhoneCall } from 'lucide-react';
import type { I18n } from '@/lib/i18n';
import { telHref } from '@/content/site';
import { href } from '@/lib/routes';
import { WhatsAppLink } from './WhatsAppLink';

/** The three big contact buttons: WhatsApp, Call, Request a callback. */
export function ContactButtons({
  i18n,
  src,
  message,
  showCallback = true,
  className = '',
}: {
  i18n: I18n;
  src?: string;
  message?: string;
  showCallback?: boolean;
  className?: string;
}) {
  const { t, lang } = i18n;
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:flex-wrap ${className}`}>
      <WhatsAppLink
        message={message ?? t('whatsappMessage.default')}
        src={src}
        className="btn btn-whatsapp btn-lg"
      >
        <MessageCircle className="size-5" aria-hidden />
        {t('common.whatsapp')}
      </WhatsAppLink>
      <a href={telHref()} className="btn btn-dark btn-lg">
        <Phone className="size-5" aria-hidden />
        {t('common.call')}
      </a>
      {showCallback && (
        <Link href={href(lang, '/get-help')} className="btn btn-outline btn-lg">
          <PhoneCall className="size-5" aria-hidden />
          {t('common.requestCallback')}
        </Link>
      )}
    </div>
  );
}
