import { z } from 'zod';
import { site } from '@/content/site';
import { locales } from '@/lib/i18n-config';
import {
  CALLBACK_OPTIONS,
  HAS_CARD_OPTIONS,
  HELP_OPTIONS,
  ISSUE_OPTIONS,
  ORG_OPTIONS,
  WHO_OPTIONS,
  normaliseMobile,
} from '@/lib/form-options';

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => text(max).min(1, 'required');
const mobile = z.string().transform((v, ctx) => {
  const m = normaliseMobile(v);
  if (!m) {
    ctx.addIssue({ code: 'custom', message: 'mobile' });
    return z.NEVER;
  }
  return m;
});
const optionalMobile = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || v.trim() === '') return '';
    const m = normaliseMobile(v);
    if (!m) {
      ctx.addIssue({ code: 'custom', message: 'mobile' });
      return z.NEVER;
    }
    return m;
  });

const districtIds: [string, ...string[]] = ['other', ...site.districts.map((d): string => d.id)];

const common = {
  consent: z.literal(true, { message: 'consent' }),
  consentAt: text(40),
  lang: z.enum(locales),
  src: text(120).optional().default(''),
  utm_source: text(120).optional().default(''),
  utm_medium: text(120).optional().default(''),
  utm_campaign: text(120).optional().default(''),
  utm_term: text(120).optional().default(''),
  utm_content: text(120).optional().default(''),
  landing_page: text(300).optional().default(''),
  page: text(300).optional().default(''),
  /** Honeypot: real people never see or fill this. */
  website: text(200).optional().default(''),
};

export const patientSchema = z.object({
  ...common,
  name: requiredText(80),
  mobile,
  district: z.enum(districtIds),
  districtOther: text(60).optional().default(''),
  preferredLanguage: z.enum(locales),
  who: z.enum(WHO_OPTIONS),
  helpType: z.enum(HELP_OPTIONS),
  hasCard: z.enum(HAS_CARD_OPTIONS),
  callbackTime: z.enum(CALLBACK_OPTIONS),
});

export const partnerSchema = z.object({
  ...common,
  orgType: z.enum(ORG_OPTIONS),
  orgName: requiredText(120),
  contactName: requiredText(80),
  role: text(80).optional().default(''),
  mobile,
  email: z
    .union([z.literal(''), z.email('email').max(120)])
    .optional()
    .default(''),
  city: text(80).optional().default(''),
  message: text(1500).optional().default(''),
});

export const reportSchema = z.object({
  ...common,
  issue: z.enum(ISSUE_OPTIONS),
  where: text(200).optional().default(''),
  details: requiredText(1500),
  name: text(80).optional().default(''),
  mobile: optionalMobile,
});
