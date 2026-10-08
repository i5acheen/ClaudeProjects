import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { z } from 'zod';
import { site } from '@/content/site';
import { makeLeadId } from './lead-id';
import { rateLimited } from './rate-limit';

type FormKind = 'patient' | 'partner' | 'report';

const PREFIX: Record<FormKind, 'PN' | 'PT' | 'RP'> = { patient: 'PN', partner: 'PT', report: 'RP' };
const MAX_BODY_BYTES = 10_000;

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-real-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}

/**
 * Validate a form submission and forward it to the Google Apps Script webhook,
 * which appends a row to the Google Sheet. Returns { ok, leadId } or an error.
 */
export async function handleSubmission<S extends z.ZodType<Record<string, unknown>>>(
  req: NextRequest,
  kind: FormKind,
  schema: S,
) {
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }

  // Honeypot: pretend success so bots learn nothing, but store nothing.
  if (body && typeof body === 'object' && (body as Record<string, unknown>).website) {
    return NextResponse.json({ ok: true, leadId: makeLeadId(PREFIX[kind]) });
  }

  if (rateLimited(`${kind}:${clientIp(req)}`)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? 'form');
      fields[field] ??= ['mobile', 'email', 'consent', 'required'].includes(issue.message)
        ? issue.message
        : 'required';
    }
    return NextResponse.json({ ok: false, error: 'validation', fields }, { status: 422 });
  }

  const data = { ...parsed.data } as Record<string, unknown>;
  delete data.website;
  delete data.consent;

  const leadId = makeLeadId(PREFIX[kind]);
  const row = {
    form: kind,
    leadId,
    receivedAt: new Date().toISOString(),
    consentGiven: 'yes',
    privacyPolicyVersion: site.privacyPolicyVersion,
    ...data,
  };

  const url = process.env.SHEET_WEBHOOK_URL;
  const secret = process.env.SHEET_WEBHOOK_SECRET;

  if (!url || !secret) {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[forms] SHEET_WEBHOOK_URL not set — dev mode, not stored:', row);
      return NextResponse.json({ ok: true, leadId, devMode: true });
    }
    console.error('[forms] SHEET_WEBHOOK_URL / SHEET_WEBHOOK_SECRET missing');
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret, row }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10_000),
      cache: 'no-store',
    });
    const result = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    if (!res.ok || !result?.ok) throw new Error(`webhook responded ${res.status}`);
  } catch (err) {
    // Log the lead ID only — never personal data — so it can be traced.
    console.error(`[forms] webhook failed for ${leadId}:`, (err as Error).message);
    return NextResponse.json({ ok: false, error: 'webhook' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, leadId });
}
