import type { ReactNode } from 'react';

/** Matches "[UPPER CASE PLACEHOLDER — optional note]". Shared with scripts/check-placeholders.mjs. */
export const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9 ,.'’/&()+_-]*(?: [—–] [^\]\n]*)?\]/g;

/** Render text, wrapping any [PLACEHOLDER] in a yellow <mark> so none slips into production. */
export function rich(text: string): ReactNode {
  const parts = text.split(/(\[[A-Z][A-Z0-9 ,.'’/&()+_-]*(?: [—–] [^\]\n]*)?\])/g);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="ph" title="Placeholder — replace before launch">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
