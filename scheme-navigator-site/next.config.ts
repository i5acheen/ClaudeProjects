import type { NextConfig } from 'next';
import path from 'node:path';
import campsData from './content/camps.json';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * Content Security Policy. Google Analytics and Meta Pixel hosts are allowed,
 * but those scripts only load if their env var is set AND the visitor accepts
 * the consent banner. 'unsafe-inline' is needed for Next.js's inline bootstrap
 * scripts on statically generated pages.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://connect.facebook.net https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://www.google-analytics.com https://www.googletagmanager.com https://www.facebook.com",
  "font-src 'self'",
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com https://www.facebook.com https://connect.facebook.net",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: { root: path.resolve(import.meta.dirname) },
  experimental: {
    globalNotFound: true,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      { source: '/', destination: '/mr', permanent: false },
      // QR-friendly short links for camps: /c/<slug> → Marathi camp page, tagged with the camp's src.
      ...campsData.camps.map((camp) => ({
        source: `/c/${camp.slug}`,
        destination: `/mr/camps/${camp.slug}?src=${encodeURIComponent(camp.src)}`,
        permanent: false,
      })),
    ];
  },
};

export default nextConfig;
