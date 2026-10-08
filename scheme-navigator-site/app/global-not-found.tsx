import type { Metadata } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Page not found — पान सापडले नाही',
  robots: { index: false },
};

const links = [
  { lang: 'mr', title: 'पान सापडले नाही', home: 'मुख्य पानावर जा' },
  { lang: 'hi', title: 'पेज नहीं मिला', home: 'होम पेज पर जाएं' },
  { lang: 'en', title: 'Page not found', home: 'Go to home page' },
];

export default function GlobalNotFound() {
  return (
    <html lang="mr-IN" className={`${inter.variable} ${devanagari.variable}`}>
      <body className="min-h-dvh bg-white">
        <main className="container-x py-20">
          <p className="text-6xl font-bold text-brand-700">404</p>
          <ul className="mt-8 space-y-6">
            {links.map((l) => (
              <li key={l.lang} lang={l.lang}>
                <h1 className="text-2xl font-bold">{l.title}</h1>
                <a href={`/${l.lang}`} className="link">
                  {l.home}
                </a>
              </li>
            ))}
          </ul>
        </main>
      </body>
    </html>
  );
}
