/**
 * Make printable QR codes (PNG + SVG) for posters, camps and ration-shop notices.
 *
 *   npm run qr -- --url https://example.org/mr/get-help --src camp-hadapsar-oct
 *   npm run qr -- --url https://example.org/c/sample-camp-hadapsar --name hadapsar-poster
 *
 * Options:
 *   --url   page to open (required)
 *   --src   adds ?src=<value> so every enquiry from this QR is tagged (letters, digits, - only)
 *   --name  file name (default: the src, or "qr")
 *   --out   folder (default: qr-codes)
 *   --size  PNG width in pixels (default: 1200 — sharp at A4 poster size)
 *
 * Runs on Node 22.18+ (TypeScript types are stripped automatically).
 */
import QRCode from 'qrcode';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const url = arg('url');
const src = arg('src');
if (!url) {
  console.error('Usage: npm run qr -- --url <page url> [--src <tag>] [--name <file>] [--out <dir>]');
  process.exit(1);
}
if (src && !/^[a-z0-9-]+$/i.test(src)) {
  console.error('--src may only contain letters, digits and dashes, e.g. camp-hadapsar-oct');
  process.exit(1);
}

const target = new URL(url);
if (src) target.searchParams.set('src', src);
const name = arg('name') ?? src ?? 'qr';
const outDir = arg('out') ?? 'qr-codes';
const size = Number(arg('size') ?? 1200);

mkdirSync(outDir, { recursive: true });
const options = { errorCorrectionLevel: 'M' as const, margin: 2, color: { dark: '#000000', light: '#ffffff' } };

const png = await QRCode.toBuffer(target.toString(), { ...options, width: size, type: 'png' });
writeFileSync(join(outDir, `${name}.png`), png);
const svg = await QRCode.toString(target.toString(), { ...options, type: 'svg' });
writeFileSync(join(outDir, `${name}.svg`), svg);

console.log(`✓ ${target.toString()}`);
console.log(`  → ${join(outDir, `${name}.png`)}\n  → ${join(outDir, `${name}.svg`)}`);
