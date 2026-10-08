'use client';

import type { Lang } from '@/lib/i18n-config';
import { ISSUE_OPTIONS } from '@/lib/form-options';
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
  { name: 'issue', kind: 'required' },
  { name: 'details', kind: 'required' },
  { name: 'mobile', kind: 'optionalMobile' },
  { name: 'consent', kind: 'consent' },
];

export function ReportForm({ strings, contact, lang }: { strings: FormStrings; contact: ContactInfo; lang: Lang }) {
  const { status, errors, onSubmit, summaryRef } = useFormSubmit('/api/report', RULES, lang);
  const r = strings.report;

  if (status.state === 'done') {
    return <ThanksPanel title={r.thanksTitle} strings={strings} leadId={status.leadId} contact={contact} />;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5" aria-labelledby="report-form-title">
      <h2 id="report-form-title" className="text-2xl font-bold">
        {r.title}
      </h2>
      {status.state === 'error' && <ErrorPanel strings={strings} contact={contact} panelRef={summaryRef} />}
      <ErrorSummary errors={errors} strings={strings} />
      <Honeypot />
      <RadioGroup
        name="issue"
        label={r.issue}
        strings={strings}
        error={errors.issue}
        options={ISSUE_OPTIONS.map((id) => ({ value: id, label: r.issueOptions[id] }))}
      />
      <TextField name="where" label={r.where} strings={strings} maxLength={200} />
      <TextField
        name="details"
        label={r.details}
        hint={r.detailsHint}
        strings={strings}
        error={errors.details}
        required
        multiline
        maxLength={1500}
      />
      <p className="text-base text-muted">{r.anonymousHint}</p>
      <TextField name="name" label={r.name} strings={strings} autoComplete="name" />
      <TextField
        name="mobile"
        label={r.mobile}
        strings={strings}
        error={errors.mobile}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        maxLength={16}
      />
      <ConsentField label={r.consent} strings={strings} error={errors.consent} privacyHref={contact.privacyHref} />
      <SubmitButton sending={status.state === 'sending'} strings={strings} />
    </form>
  );
}
