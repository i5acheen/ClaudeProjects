'use client';

import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { CheckCircle2, MessageCircle, Phone, AlertTriangle } from 'lucide-react';
import type { Messages } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';
import { normaliseMobile } from '@/lib/form-options';
import { readSource } from '@/lib/source';
import { trackLeadSubmitted } from '@/lib/track';
import { whatsappHref } from '@/lib/whatsapp';
import { rich } from '@/lib/placeholders';

export type FormStrings = Messages['forms'];
export type ErrorKey = keyof FormStrings['errors'];

export type ContactInfo = {
  telHref: string;
  phone: string;
  privacyHref: string;
  helplinesTitle: string;
  helplines: { number: string; label: string }[];
  whatsappLabel: string;
  callLabel: string;
  whatsappMessage: string;
};

export type Rule = { name: string; kind: 'required' | 'mobile' | 'optionalMobile' | 'email' | 'consent' };

function validate(form: HTMLFormElement, rules: Rule[]): Record<string, ErrorKey> {
  const data = new FormData(form);
  const errors: Record<string, ErrorKey> = {};
  for (const { name, kind } of rules) {
    const value = String(data.get(name) ?? '').trim();
    if (kind === 'consent') {
      if (!data.get(name)) errors[name] = 'consent';
    } else if (kind === 'required') {
      if (!value) errors[name] = 'required';
    } else if (kind === 'mobile') {
      if (!value) errors[name] = 'required';
      else if (!normaliseMobile(value)) errors[name] = 'mobile';
    } else if (kind === 'optionalMobile') {
      if (value && !normaliseMobile(value)) errors[name] = 'mobile';
    } else if (kind === 'email') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors[name] = 'email';
    }
  }
  return errors;
}

type Status =
  | { state: 'idle' }
  | { state: 'sending' }
  | { state: 'error' }
  | { state: 'done'; leadId: string };

/** Submit logic shared by all three forms. The form stays mounted on error, so nothing typed is lost. */
export function useFormSubmit(endpoint: string, rules: Rule[], lang: Lang) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [errors, setErrors] = useState<Record<string, ErrorKey>>({});
  const summaryRef = useRef<HTMLDivElement>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status.state === 'sending') return;
    const form = e.currentTarget;
    const found = validate(form, rules);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = form.querySelector<HTMLElement>(`[name="${Object.keys(found)[0]}"]`);
      first?.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, unknown>;
    const payload = {
      ...data,
      ...readSource(),
      consent: data.consent === 'on',
      consentAt: new Date().toISOString(),
      lang,
    };

    setStatus({ state: 'sending' });
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        leadId?: string;
        fields?: Record<string, ErrorKey>;
      } | null;
      if (res.ok && json?.ok && json.leadId) {
        trackLeadSubmitted();
        setStatus({ state: 'done', leadId: json.leadId });
        return;
      }
      if (json?.fields) setErrors(json.fields);
      setStatus({ state: 'error' });
    } catch {
      setStatus({ state: 'error' });
    }
    requestAnimationFrame(() => summaryRef.current?.focus());
  }

  return { status, errors, onSubmit, summaryRef };
}

export function FieldError({ id, error, strings }: { id: string; error?: ErrorKey; strings: FormStrings }) {
  if (!error) return null;
  return (
    <p id={id} className="field-error">
      {strings.errors[error]}
    </p>
  );
}

export function TextField({
  name,
  label,
  strings,
  error,
  required,
  hint,
  type = 'text',
  autoComplete,
  inputMode,
  maxLength = 80,
  multiline = false,
}: {
  name: string;
  label: string;
  strings: FormStrings;
  error?: ErrorKey;
  required?: boolean;
  hint?: string;
  type?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email' | 'numeric';
  maxLength?: number;
  multiline?: boolean;
}) {
  const id = `f-${name}`;
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined;
  const common = {
    id,
    name,
    className: 'field',
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    maxLength,
  };
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}{' '}
        <span className="text-base font-normal text-muted">
          ({required ? strings.required : strings.optional})
        </span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="-mt-0.5 mb-1.5 text-base text-muted">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input {...common} type={type} autoComplete={autoComplete} inputMode={inputMode} />
      )}
      <FieldError id={`${id}-err`} error={error} strings={strings} />
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
  strings,
  error,
  required = true,
  defaultValue = '',
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  strings: FormStrings;
  error?: ErrorKey;
  required?: boolean;
  defaultValue?: string;
}) {
  const id = `f-${name}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}{' '}
        <span className="text-base font-normal text-muted">
          ({required ? strings.required : strings.optional})
        </span>
      </label>
      <select
        id={id}
        name={name}
        className="field"
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        aria-required={required || undefined}
      >
        <option value="" disabled={required}>
          {strings.select}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <FieldError id={`${id}-err`} error={error} strings={strings} />
    </div>
  );
}

export function RadioGroup({
  name,
  label,
  options,
  strings,
  error,
  columns = 1,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  strings: FormStrings;
  error?: ErrorKey;
  columns?: 1 | 2 | 3;
}) {
  const id = `f-${name}`;
  const grid = columns === 3 ? 'sm:grid-cols-3' : columns === 2 ? 'sm:grid-cols-2' : '';
  return (
    <fieldset aria-describedby={error ? `${id}-err` : undefined}>
      <legend className="field-label">
        {label} <span className="text-base font-normal text-muted">({strings.required})</span>
      </legend>
      <div className={`grid gap-2 ${grid}`}>
        {options.map((o, i) => (
          <label key={o.value} className="choice">
            <input
              type="radio"
              name={name}
              value={o.value}
              id={i === 0 ? id : undefined}
              aria-invalid={error ? true : undefined}
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <FieldError id={`${id}-err`} error={error} strings={strings} />
    </fieldset>
  );
}

export function ConsentField({
  label,
  strings,
  error,
  privacyHref,
}: {
  label: string;
  strings: FormStrings;
  error?: ErrorKey;
  privacyHref: string;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-line p-3">
        <input
          type="checkbox"
          name="consent"
          className="mt-1 size-6 shrink-0 accent-brand-700"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'f-consent-err' : undefined}
        />
        <span className="text-base">
          {rich(label)}{' '}
          <a href={privacyHref} className="link" target="_blank" rel="noopener">
            {strings.privacyLink}
          </a>
        </span>
      </label>
      <FieldError id="f-consent-err" error={error} strings={strings} />
    </div>
  );
}

/** Hidden from people and screen readers; bots tend to fill it. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Website
        <input type="text" name="website" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );
}

export function ContactFallback({ contact, leadId }: { contact: ContactInfo; leadId?: string }) {
  const message = leadId ? `${contact.whatsappMessage} (${leadId})` : contact.whatsappMessage;
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <a
        href={whatsappHref(message)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-whatsapp"
      >
        <MessageCircle className="size-5" aria-hidden />
        {contact.whatsappLabel}
      </a>
      <a href={contact.telHref} className="btn btn-dark">
        <Phone className="size-5" aria-hidden />
        {contact.callLabel} {rich(contact.phone)}
      </a>
    </div>
  );
}

export function ErrorPanel({
  strings,
  contact,
  panelRef,
}: {
  strings: FormStrings;
  contact: ContactInfo;
  panelRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="alert"
      className="rounded-2xl border-2 border-red-700 bg-red-50 p-4"
    >
      <p className="flex items-center gap-2 text-lg font-bold text-red-800">
        <AlertTriangle className="size-5" aria-hidden />
        {strings.failTitle}
      </p>
      <p className="mt-1 text-base">{strings.failText}</p>
      <div className="mt-3">
        <ContactFallback contact={contact} />
      </div>
    </div>
  );
}

export function ErrorSummary({ errors, strings }: { errors: Record<string, ErrorKey>; strings: FormStrings }) {
  if (!Object.keys(errors).length) return null;
  return (
    <p role="alert" className="rounded-xl bg-red-50 p-3 text-base font-semibold text-red-800">
      {strings.errorsTitle}
    </p>
  );
}

export function ThanksPanel({
  title,
  strings,
  leadId,
  contact,
  children,
}: {
  title: string;
  strings: FormStrings;
  leadId: string;
  contact: ContactInfo;
  children?: ReactNode;
}) {
  return (
    <div
      ref={(el) => el?.focus()}
      tabIndex={-1}
      role="status"
      className="card space-y-4 outline-none"
    >
      <h2 className="flex items-center gap-2 text-2xl font-bold">
        <CheckCircle2 className="size-7 shrink-0 text-brand-700" aria-hidden />
        {title}
      </h2>
      <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
        <p className="text-base text-muted">{strings.leadIdLabel}</p>
        <p className="font-mono text-3xl font-bold tracking-wider text-ink">{leadId}</p>
        <p className="mt-1 text-base text-muted">{strings.leadIdHint}</p>
      </div>
      {children}
      <ContactFallback contact={contact} leadId={leadId} />
      <div className="text-base">
        <p className="font-semibold">{contact.helplinesTitle}</p>
        <ul className="mt-1 space-y-1">
          {contact.helplines.map((h) => (
            <li key={h.number}>
              <a href={`tel:${h.number}`} className="link text-xl font-bold">
                {h.number}
              </a>{' '}
              <span className="text-muted">— {h.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SubmitButton({ sending, strings }: { sending: boolean; strings: FormStrings }) {
  return (
    <button type="submit" className="btn btn-primary btn-lg w-full sm:w-auto" disabled={sending} aria-busy={sending}>
      {sending ? strings.sending : strings.submit}
    </button>
  );
}
