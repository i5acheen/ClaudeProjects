import type { Accent } from '../data/industry'

/** Static class & colour lookups so Tailwind can see every class name. */
export const accentHex: Record<Accent, string> = {
  cyan: '#22d3ee',
  teal: '#2dd4bf',
  amber: '#f2a54a',
  violet: '#a78bfa',
  green: '#76b900',
  slate: '#a3b1c2',
}

export const accentText: Record<Accent, string> = {
  cyan: 'text-cyan',
  teal: 'text-teal',
  amber: 'text-amber',
  violet: 'text-violet',
  green: 'text-nvgreen',
  slate: 'text-slate',
}

export const accentBorder: Record<Accent, string> = {
  cyan: 'border-cyan/50',
  teal: 'border-teal/50',
  amber: 'border-amber/50',
  violet: 'border-violet/50',
  green: 'border-nvgreen/50',
  slate: 'border-slate/40',
}

export const accentSoftBg: Record<Accent, string> = {
  cyan: 'bg-cyan/10',
  teal: 'bg-teal/10',
  amber: 'bg-amber/10',
  violet: 'bg-violet/10',
  green: 'bg-nvgreen/10',
  slate: 'bg-slate/10',
}
