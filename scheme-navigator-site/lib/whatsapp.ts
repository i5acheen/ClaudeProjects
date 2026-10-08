import { site, isPlaceholder } from '@/content/site';

export function whatsappHref(message: string, src?: string): string {
  if (isPlaceholder(site.whatsapp)) return '#placeholder-whatsapp';
  const text = src ? `${message} (src: ${src})` : message;
  return `https://wa.me/${site.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}
