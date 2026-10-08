import { randomBytes } from 'node:crypto';

/** e.g. PN-261008-4F2A (prefix, IST date YYMMDD, 4 random hex chars). */
export function makeLeadId(prefix: 'PN' | 'PT' | 'RP', now = new Date()): string {
  const ist = new Date(now.getTime() + 5.5 * 3600 * 1000);
  const ymd = ist.toISOString().slice(2, 10).replace(/-/g, '');
  const rand = randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${ymd}-${rand}`;
}
