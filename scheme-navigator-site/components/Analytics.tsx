'use client';

import Link from 'next/link';
import Script from 'next/script';
import { useEffect, useState } from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/next';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID;
const KEY = 'mhc_analytics_consent';

type Choice = 'granted' | 'denied' | null;

function readChoice(): Choice {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

/** GA page_location keeps only the path and src/utm tags. */
const gaInit = (id: string) =>
  `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());` +
  `var u=new URL(location.href),k=new URLSearchParams();['src','utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(function(n){var v=u.searchParams.get(n);if(v)k.set(n,v)});` +
  `gtag('config',${JSON.stringify(id)},{page_location:u.origin+u.pathname+(k.toString()?'?'+k.toString():'')});`;

/**
 * Vercel Web Analytics (cookieless) always runs. Google Analytics 4 and Meta Pixel
 * load only if their env var is set AND the visitor accepts the banner.
 */
export function Analytics({
  text,
  accept,
  decline,
  policyLabel,
  policyHref,
}: {
  text: string;
  accept: string;
  decline: string;
  policyLabel: string;
  policyHref: string;
}) {
  const needsConsent = Boolean(GA_ID || PIXEL_ID);
  const [choice, setChoice] = useState<Choice>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setChoice(readChoice());
    setReady(true);
  }, []);

  const decide = (c: 'granted' | 'denied') => {
    try {
      localStorage.setItem(KEY, c);
    } catch {
      /* ignore */
    }
    setChoice(c);
  };

  const granted = choice === 'granted';

  return (
    <>
      <VercelAnalytics />
      {granted && GA_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {gaInit(GA_ID)}
          </Script>
        </>
      )}
      {granted && PIXEL_ID && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init',${JSON.stringify(PIXEL_ID)});fbq('track','PageView');`}
        </Script>
      )}
      {needsConsent && ready && choice === null && (
        <div
          role="region"
          aria-label={policyLabel}
          className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-xl rounded-2xl border border-line bg-white p-4 shadow-xl md:bottom-4"
        >
          <p className="text-base">
            {text}{' '}
            <Link href={policyHref} className="link">
              {policyLabel}
            </Link>
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="btn btn-primary !min-h-12 flex-1"
              onClick={() => decide('granted')}
            >
              {accept}
            </button>
            <button
              type="button"
              className="btn btn-outline !min-h-12 flex-1"
              onClick={() => decide('denied')}
            >
              {decline}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
