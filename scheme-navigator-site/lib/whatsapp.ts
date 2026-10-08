import { site, isPlaceholder } from '@/content/site';

export type WhatsAppTarget = 'desk' | 'bot';

/** Click-to-chat link. 'desk' = our team's number, 'bot' = the automated WhatsApp assistant. */
export function whatsappHref(
  message: string,
  src?: string,
  target: WhatsAppTarget = 'desk',
): string {
  const number = target === 'bot' ? site.whatsappBot : site.whatsapp;
  if (isPlaceholder(number)) return `#placeholder-whatsapp-${target}`;
  const text = src ? `${message} (src: ${src})` : message;
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
