'use client';

import { SOURCE_KEYS, type SourceFields } from './form-options';

const STORAGE_KEY = 'mhc_source';
const TRACKED = [
  'src',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
] as const;

function safeGet(): Partial<SourceFields> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function safeSet(value: Partial<SourceFields>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage blocked — the current URL is still used */
  }
}

/**
 * Remember where this visit came from (camp QR `src`, ad UTM tags, first page).
 * A new src/UTM in the URL replaces the stored one; the landing page is kept from the first page.
 */
export function captureSource(defaultSrc?: string) {
  const params = new URLSearchParams(window.location.search);
  const stored = safeGet();
  const fromUrl: Partial<SourceFields> = {};
  for (const key of TRACKED) {
    const v = params.get(key);
    if (v) fromUrl[key] = v.slice(0, 120);
  }
  const hasNew = Object.keys(fromUrl).length > 0;
  const next: Partial<SourceFields> = hasNew ? { ...fromUrl } : { ...stored };
  if (!next.src && defaultSrc) next.src = defaultSrc;
  next.landing_page = stored.landing_page ?? window.location.pathname + window.location.search;
  safeSet(next);
  return next;
}

export function readSource(): SourceFields {
  const stored = safeGet();
  const out = {} as SourceFields;
  for (const key of SOURCE_KEYS) out[key] = stored[key] ?? '';
  const params = new URLSearchParams(window.location.search);
  for (const key of TRACKED) {
    const v = params.get(key);
    if (v) out[key] = v.slice(0, 120);
  }
  out.page = window.location.pathname;
  if (!out.landing_page) out.landing_page = window.location.pathname + window.location.search;
  return out;
}
