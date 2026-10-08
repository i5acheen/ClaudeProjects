'use client';

import type { Lang } from '@/lib/i18n-config';
import { ORG_OPTIONS } from '@/lib/form-options';
import {
  ConsentField,
  ErrorPanel,
  ErrorSummary,
  Honeypot,
  RadioGroup,
  SubmitButton,
  TextField,
  ThanksPanel,
  useFormSubmit,
  type ContactInfo,
  type FormStrings,
  type Rule,
} from './shared';

const RULES: Rule[] = [
  { name: 'orgType', kind: 'required' },
  { name: 'orgName', kind: 'required' },
  { name: 'contactName', kind: 'required' },
  { name: 'mobile', kind: 'mobile' },
  { name: 'email', kind: 'email' },
  { name: 'consent', kind: 'consent' },
];

export function PartnerForm({
  strings,
  contact,
  lang,
  title,
  defaultOrg,
}: {
  strings: FormStrings;
  contact: ContactInfo;
  lang: Lang;
  title: string;
  defaultOrg?: (typeof ORG_OPTIONS)[number];
}) {
  const { status, errors, onSubmit, summaryRef } = useFormSubmit('/api/partner', RULES, lang);
  const p = strings.partner;

  if (status.state === 'done') {
    return (
      <ThanksPanel
        title={strings.thanksTitle}
        strings={strings}
        leadId={status.leadId}
        contact={contact}
      />
    );
  }

  const orgOptions = ORG_OPTIONS.map((id) => ({ value: id, label: p.orgOptions[id] }));
  if (defaultOrg)
    orgOptions.sort((a, b) => (a.value === defaultOrg ? -1 : b.value === defaultOrg ? 1 : 0));

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="relative space-y-5"
      aria-labelledby="partner-form-title"
    >
      <h2 id="partner-form-title" className="text-2xl font-bold">
        {title}
      </h2>
      {status.state === 'error' && (
        <ErrorPanel strings={strings} contact={contact} panelRef={summaryRef} />
      )}
      <ErrorSummary errors={errors} strings={strings} />
      <Honeypot />
      <RadioGroup
        name="orgType"
        label={p.orgType}
        strings={strings}
        error={errors.orgType}
        columns={2}
        options={orgOptions}
      />
      <TextField
        name="orgName"
        label={p.orgName}
        strings={strings}
        error={errors.orgName}
        required
        autoComplete="organization"
        maxLength={120}
      />
      <TextField
        name="contactName"
        label={p.contactName}
        strings={strings}
        error={errors.contactName}
        required
        autoComplete="name"
      />
      <TextField name="role" label={p.role} strings={strings} autoComplete="organization-title" />
      <TextField
        name="mobile"
        label={p.mobile}
        strings={strings}
        error={errors.mobile}
        required
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={16}
      />
      <TextField
        name="email"
        label={p.email}
        strings={strings}
        error={errors.email}
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={120}
      />
      <TextField name="city" label={p.city} strings={strings} autoComplete="address-level2" />
      <TextField
        name="message"
        label={p.message}
        hint={p.messageHint}
        strings={strings}
        multiline
        maxLength={1500}
      />
      <ConsentField
        label={p.consent}
        strings={strings}
        error={errors.consent}
        privacyHref={contact.privacyHref}
      />
      <SubmitButton sending={status.state === 'sending'} strings={strings} />
    </form>
  );
}
