'use client';

import type { Lang } from '@/lib/i18n-config';
import { localeNames, locales } from '@/lib/i18n-config';
import { CALLBACK_OPTIONS, HAS_CARD_OPTIONS, HELP_OPTIONS, WHO_OPTIONS } from '@/lib/form-options';
import { rich } from '@/lib/placeholders';
import {
  ConsentField,
  ErrorPanel,
  ErrorSummary,
  Honeypot,
  RadioGroup,
  SelectField,
  SubmitButton,
  TextField,
  ThanksPanel,
  useFormSubmit,
  type ContactInfo,
  type FormStrings,
  type Rule,
} from './shared';

const RULES: Rule[] = [
  { name: 'name', kind: 'required' },
  { name: 'mobile', kind: 'mobile' },
  { name: 'district', kind: 'required' },
  { name: 'preferredLanguage', kind: 'required' },
  { name: 'who', kind: 'required' },
  { name: 'helpType', kind: 'required' },
  { name: 'hasCard', kind: 'required' },
  { name: 'callbackTime', kind: 'required' },
  { name: 'consent', kind: 'consent' },
];

export function PatientForm({
  strings,
  contact,
  lang,
  districts,
  freeNote,
  callbackPromise,
  title,
  headingLevel = 2,
}: {
  strings: FormStrings;
  contact: ContactInfo;
  lang: Lang;
  districts: { value: string; label: string }[];
  freeNote: string;
  callbackPromise: string;
  title?: string;
  headingLevel?: 2 | 3;
}) {
  const { status, errors, onSubmit, summaryRef } = useFormSubmit('/api/enquiry', RULES, lang);
  const p = strings.patient;
  const opts = <T extends string>(ids: readonly T[], labels: Record<T, string>) =>
    ids.map((id) => ({ value: id, label: labels[id] }));
  const H = headingLevel === 2 ? 'h2' : 'h3';

  if (status.state === 'done') {
    return (
      <ThanksPanel title={strings.thanksTitle} strings={strings} leadId={status.leadId} contact={contact}>
        <p className="text-lg">{rich(callbackPromise)}</p>
      </ThanksPanel>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5" aria-labelledby="patient-form-title">
      <H id="patient-form-title" className="text-2xl font-bold">
        {title ?? p.title}
      </H>
      <p className="rounded-xl bg-brand-50 p-3 font-semibold text-brand-800">{freeNote}</p>
      <p className="rounded-xl bg-warm-50 p-3 text-base text-warm-800">{strings.noDocsNote}</p>
      {status.state === 'error' && <ErrorPanel strings={strings} contact={contact} panelRef={summaryRef} />}
      <ErrorSummary errors={errors} strings={strings} />
      <Honeypot />
      <TextField name="name" label={p.name} strings={strings} error={errors.name} required autoComplete="name" />
      <TextField
        name="mobile"
        label={p.mobile}
        hint={p.mobileHint}
        strings={strings}
        error={errors.mobile}
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={16}
      />
      <SelectField
        name="district"
        label={p.district}
        strings={strings}
        error={errors.district}
        options={[...districts, { value: 'other', label: p.districtOther }]}
      />
      <SelectField
        name="preferredLanguage"
        label={p.language}
        strings={strings}
        error={errors.preferredLanguage}
        defaultValue={lang}
        options={locales.map((l) => ({ value: l, label: localeNames[l] }))}
      />
      <RadioGroup name="who" label={p.who} strings={strings} error={errors.who} options={opts(WHO_OPTIONS, p.whoOptions)} />
      <SelectField
        name="helpType"
        label={p.helpType}
        strings={strings}
        error={errors.helpType}
        options={opts(HELP_OPTIONS, p.helpOptions)}
      />
      <RadioGroup
        name="hasCard"
        label={p.hasCard}
        strings={strings}
        error={errors.hasCard}
        columns={3}
        options={opts(HAS_CARD_OPTIONS, p.hasCardOptions)}
      />
      <SelectField
        name="callbackTime"
        label={p.callbackTime}
        strings={strings}
        error={errors.callbackTime}
        options={opts(CALLBACK_OPTIONS, p.callbackOptions)}
      />
      <ConsentField label={strings.consent} strings={strings} error={errors.consent} privacyHref={contact.privacyHref} />
      <SubmitButton sending={status.state === 'sending'} strings={strings} />
    </form>
  );
}
