/**
 * Translation check. Runs before every build and prints a WARNING (never fails):
 *  - strings missing from mr.json / hi.json (English is shown instead)
 *  - strings not yet reviewed by a native speaker
 *
 * Mark strings reviewed in messages/<lang>.json → "_meta":
 *   "reviewed": true               → whole file reviewed
 *   "reviewedKeys": ["home.title"] → individual strings (prefixes like "home" work too)
 *
 *   npm run check:i18n             summary
 *   npm run check:i18n -- --list   every unreviewed key
 *   npm run i18n:export            writes translations-review.csv for reviewers
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const read = (lang) => JSON.parse(readFileSync(join(root, 'messages', `${lang}.json`), 'utf8'));

function flatten(obj, prefix = '', out = {}) {
  if (Array.isArray(obj)) obj.forEach((v, i) => flatten(v, `${prefix}.${i}`, out));
  else if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      if (k === '_meta') continue;
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else out[prefix] = String(obj);
  return out;
}

const en = flatten(read('en'));
const report = {};
for (const lang of ['mr', 'hi']) {
  const data = read(lang);
  const meta = data._meta ?? {};
  const flat = flatten(data);
  const missing = Object.keys(en).filter((k) => !(k in flat));
  const reviewedKeys = meta.reviewedKeys ?? [];
  const isReviewed = (k) =>
    meta.reviewed === true || reviewedKeys.some((r) => k === r || k.startsWith(`${r}.`));
  const unreviewed = Object.keys(flat).filter((k) => !isReviewed(k));
  report[lang] = { flat, missing, unreviewed };
}

const list = process.argv.includes('--list');
for (const [lang, r] of Object.entries(report)) {
  if (r.missing.length) {
    console.warn(`⚠️  [i18n] ${lang}: ${r.missing.length} string(s) missing (English shown instead):`);
    r.missing.slice(0, list ? undefined : 10).forEach((k) => console.warn(`     - ${k}`));
  }
  if (r.unreviewed.length) {
    console.warn(
      `⚠️  [i18n] ${lang}: ${r.unreviewed.length} of ${Object.keys(r.flat).length} string(s) NOT reviewed by a native speaker.`,
    );
    if (list) r.unreviewed.forEach((k) => console.warn(`     - ${k}`));
  }
}
if (!list) console.warn('   Run `npm run check:i18n -- --list` for every key, or `npm run i18n:export` for a CSV.');

if (process.argv.includes('--export')) {
  const esc = (s = '') => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [['key', 'en', 'mr', 'mr_reviewed', 'hi', 'hi_reviewed'].join(',')];
  for (const key of Object.keys(en)) {
    rows.push(
      [
        esc(key),
        esc(en[key]),
        esc(report.mr.flat[key]),
        report.mr.unreviewed.includes(key) ? 'no' : 'yes',
        esc(report.hi.flat[key]),
        report.hi.unreviewed.includes(key) ? 'no' : 'yes',
      ].join(','),
    );
  }
  writeFileSync(join(root, 'translations-review.csv'), '﻿' + rows.join('\n'));
  console.log('✓ Wrote translations-review.csv (open in Google Sheets or Excel).');
}
