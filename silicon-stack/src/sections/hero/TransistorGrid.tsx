/** A stylised close-up of transistors: silicon fins crossed by gates, with contacts. */
export function TransistorGrid({ className }: { className?: string }) {
  return (
    <svg className={className} role="img" aria-label="Close-up of a chip: rows of transistors formed where gates cross silicon fins">
      <defs>
        <pattern id="tx-cell" width="64" height="64" patternUnits="userSpaceOnUse">
          {/* silicon fins (horizontal) */}
          <rect x="0" y="14" width="64" height="5" rx="1" fill="#22d3ee" fillOpacity=".35" />
          <rect x="0" y="44" width="64" height="5" rx="1" fill="#22d3ee" fillOpacity=".35" />
          {/* gates (vertical) */}
          <rect x="14" y="6" width="8" height="52" rx="1.5" fill="#2dd4bf" fillOpacity=".22" stroke="#2dd4bf" strokeOpacity=".55" strokeWidth="1" />
          <rect x="44" y="6" width="8" height="52" rx="1.5" fill="#2dd4bf" fillOpacity=".22" stroke="#2dd4bf" strokeOpacity=".55" strokeWidth="1" />
          {/* contacts */}
          <circle cx="32" cy="16.5" r="2.4" fill="#f2a54a" fillOpacity=".85" />
          <circle cx="4" cy="46.5" r="2.4" fill="#f2a54a" fillOpacity=".85" />
        </pattern>
        <radialGradient id="tx-fade" cx="50%" cy="50%" r="60%">
          <stop offset="40%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tx-mask">
          <rect width="100%" height="100%" fill="url(#tx-fade)" />
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#tx-cell)" mask="url(#tx-mask)" />
    </svg>
  )
}
