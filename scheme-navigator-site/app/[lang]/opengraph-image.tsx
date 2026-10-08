import { ImageResponse } from 'next/og';
import { site } from '@/content/site';
import { locales } from '@/lib/i18n-config';

export const alt = 'Maharashtra Health Connect — free help to use government health schemes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

/** Social sharing card (Latin text only, so it renders with the built-in font). */
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 72,
        background: 'linear-gradient(180deg, #f5f5ff 0%, #ffffff 70%)',
        color: '#111827',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            background: '#5b52d6',
            display: 'flex',
          }}
        />
        <div style={{ fontSize: 40, fontWeight: 700 }}>{site.name}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>
          Free help to use government health schemes
        </div>
        <div style={{ fontSize: 34, color: '#4b5563' }}>
          Check your cover · Get documents ready · Reach the right hospital
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: '#ffffff',
            background: '#5b52d6',
            padding: '12px 28px',
            borderRadius: 999,
          }}
        >
          Free for patients — always
        </div>
        <div style={{ fontSize: 30, color: '#4b5563', padding: '12px 0' }}>
          Independent · Not a government office
        </div>
      </div>
    </div>,
    size,
  );
}
