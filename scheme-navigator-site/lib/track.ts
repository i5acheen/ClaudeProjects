'use client';

import { track } from '@vercel/analytics';

type Gtag = (...args: unknown[]) => void;

/**
 * The ONLY custom analytics event. It never carries form values, health needs
 * or personal data — just the fact that a form was sent.
 */
export function trackLeadSubmitted() {
  try {
    track('lead_submitted');
    const w = window as unknown as { gtag?: Gtag; fbq?: Gtag };
    w.gtag?.('event', 'lead_submitted');
    w.fbq?.('track', 'Lead');
  } catch {
    /* analytics must never break the form */
  }
}
