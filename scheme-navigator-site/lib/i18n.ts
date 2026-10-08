import en from '@/messages/en.json';
import mr from '@/messages/mr.json';
import hi from '@/messages/hi.json';
import { site } from '@/content/site';
import { factVars } from '@/content/facts';
import { type Lang } from './i18n-config';

export type Messages = typeof en;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const raw: Record<Lang, Json> = { en, mr, hi } as unknown as Record<Lang, Json>;

/** Deep-merge `base` (English) with `override`, so a missing translation falls back to English. */
function merge(base: Json, override: Json | undefined): Json {
  if (override === undefined || override === null) return base;
  if (Array.isArray(base)) return Array.isArray(override) ? override : base;
  if (typeof base === 'object' && base !== null) {
    if (typeof override !== 'object' || Array.isArray(override)) return base;
    const out: { [key: string]: Json } = {};
    for (const key of Object.keys(base)) out[key] = merge(base[key], override[key]);
    return out;
  }
  return typeof override === typeof base ? override : base;
}

const cache = new Map<Lang, Json>();
function messagesFor(lang: Lang): Json {
  let m = cache.get(lang);
  if (!m) {
    m = lang === 'en' ? raw.en : merge(raw.en, raw[lang]);
    cache.set(lang, m);
  }
  return m;
}

export function globalVars(lang: Lang): Record<string, string> {
  return {
    business: site.name,
    phone: site.phone,
    whatsapp: site.whatsapp,
    email: site.email,
    address: site.address,
    domain: site.domain,
    callbackHours: site.callbackHours[lang],
    version: site.privacyPolicyVersion,
    districts: site.districts.map((d) => d[lang]).join(lang === 'en' ? ' and ' : ', '),
    ...factVars(lang),
  };
}

export function interpolate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? vars[name] : match));
}

function deepInterpolate(value: Json, vars: Record<string, string>): Json {
  if (typeof value === 'string') return interpolate(value, vars);
  if (Array.isArray(value)) return value.map((v) => deepInterpolate(v, vars));
  if (value && typeof value === 'object') {
    const out: { [key: string]: Json } = {};
    for (const [k, v] of Object.entries(value)) out[k] = deepInterpolate(v, vars);
    return out;
  }
  return value;
}

function lookup(tree: Json, key: string): Json | undefined {
  let node: Json | undefined = tree;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && !Array.isArray(node)) node = node[part];
    else return undefined;
  }
  return node;
}

export function getI18n(lang: Lang) {
  const tree = messagesFor(lang);
  const base = globalVars(lang);

  /** A single string, with {variables} filled in. */
  function t(key: string, vars?: Record<string, string>): string {
    const value = lookup(tree, key);
    if (typeof value !== 'string') {
      if (process.env.NODE_ENV !== 'production') console.warn(`[i18n] missing string: ${key}`);
      return key;
    }
    return interpolate(value, vars ? { ...base, ...vars } : base);
  }

  /** Any subtree (arrays, objects) with all strings interpolated. */
  function get<T = unknown>(key: string): T {
    const value = lookup(tree, key);
    if (value === undefined) throw new Error(`[i18n] missing key: ${key}`);
    return deepInterpolate(value, base) as T;
  }

  return { t, get, lang, vars: base };
}

export type I18n = ReturnType<typeof getI18n>;
