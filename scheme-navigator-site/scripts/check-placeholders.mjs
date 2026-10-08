/**
 * Fails a production build if any [PLACEHOLDER] remains in content or messages,
 * or a required environment variable is missing.
 *
 * Runs automatically before `npm run build`. Skipped outside production.
 * To deploy a preview with placeholders on purpose, set ALLOW_PLACEHOLDERS=1.
 * Run `npm run check:placeholders` any time to see the list.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PLACEHOLDER_RE = /\[[A-Z][A-Z0-9 ,.'’/&()+_-]*(?: [—–] [^\]\n]*)?\]/g;
const root = new URL('..', import.meta.url).pathname;
const files = [
  ...readdirSync(join(root, 'content')).map((f) => join('content', f)),
  ...readdirSync(join(root, 'messages')).map((f) => join('messages', f)),
];

const found = new Map();
for (const file of files) {
  const lines = readFileSync(join(root, file), 'utf8').split('\n');
  lines.forEach((line, i) => {
    // Env-var fallbacks in site.ts are checked through the env vars below.
    if (line.includes('envOr(')) return;
    // Skip code comments and regular expressions (they describe placeholders, they are not placeholders).
    const trimmed = line.trim();
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return;
    if (line.includes('.test(')) return;
    for (const match of line.matchAll(PLACEHOLDER_RE)) {
      const key = match[0];
      if (!found.has(key)) found.set(key, []);
      found.get(key).push(`${file}:${i + 1}`);
    }
  });
}

const requiredEnv = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_WHATSAPP_NUMBER',
  'NEXT_PUBLIC_PHONE',
  'NEXT_PUBLIC_EMAIL',
  'SHEET_WEBHOOK_URL',
  'SHEET_WEBHOOK_SECRET',
];
const missingEnv = requiredEnv.filter((k) => !process.env[k]);

const isProd =
  process.env.NODE_ENV === 'production' ||
  process.env.VERCEL_ENV === 'production' ||
  process.argv.includes('--strict');
const allowed = Boolean(process.env.ALLOW_PLACEHOLDERS);

if (found.size || missingEnv.length) {
  const log = isProd && !allowed ? console.error : console.warn;
  log(`\n⚠️  ${found.size} placeholder(s) remain:`);
  for (const [key, where] of found) log(`   ${key}  (${where.length}×, e.g. ${where[0]})`);
  if (missingEnv.length) log(`⚠️  Missing env vars: ${missingEnv.join(', ')}`);
  if (isProd && !allowed) {
    console.error(
      '\n✖ Build stopped: replace the placeholders above, or set ALLOW_PLACEHOLDERS=1 for a preview.\n',
    );
    process.exit(1);
  }
  log(
    isProd
      ? '   (ALLOW_PLACEHOLDERS is set — continuing)\n'
      : '   (not a production build — continuing)\n',
  );
} else {
  console.log('✓ No placeholders remain and all required env vars are set.');
}
