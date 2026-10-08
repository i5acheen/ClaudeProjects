import { ShieldCheck } from 'lucide-react';
import type { I18n } from '@/lib/i18n';
import { rich } from '@/lib/placeholders';

export function IndependenceNote({ i18n, className = '' }: { i18n: I18n; className?: string }) {
  return (
    <p
      className={`flex gap-3 rounded-2xl border border-line bg-mist p-4 text-base text-muted ${className}`}
    >
      <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-700" aria-hidden />
      <span>{rich(i18n.t('common.independenceLine'))}</span>
    </p>
  );
}
