'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { whatsappHref, type WhatsAppTarget } from '@/lib/whatsapp';
import { readSource } from '@/lib/source';

/** WhatsApp click-to-chat link with a prefilled message tagged with the visit's source. */
export function WhatsAppLink({
  message,
  src,
  className,
  children,
  ariaLabel,
  target = 'desk',
}: {
  message: string;
  /** Force a source tag (e.g. a camp page). Otherwise the stored visit source is used. */
  src?: string;
  className?: string;
  children: ReactNode;
  ariaLabel?: string;
  /** 'bot' opens the WhatsApp assistant instead of the desk number. */
  target?: WhatsAppTarget;
}) {
  const [tag, setTag] = useState(src);
  useEffect(() => {
    if (src) return;
    const s = readSource();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is only readable after mount
    setTag(s.src || s.utm_campaign || s.page);
  }, [src]);
  return (
    <a
      href={whatsappHref(message, tag, target)}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={ariaLabel}
    >
      {children}
    </a>
  );
}
