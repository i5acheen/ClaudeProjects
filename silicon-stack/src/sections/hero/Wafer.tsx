import { memo } from 'react'

const R = 96
const DIE_W = 8
const DIE_H = 9.5
const GAP = 1.1

/** Pre-compute the dies that fit fully inside the wafer edge. */
const dies = (() => {
  const out: { x: number; y: number; tint: number }[] = []
  const stepX = DIE_W + GAP
  const stepY = DIE_H + GAP
  for (let y = -R; y < R; y += stepY) {
    for (let x = -R; x < R; x += stepX) {
      const corners = [
        [x, y],
        [x + DIE_W, y],
        [x, y + DIE_H],
        [x + DIE_W, y + DIE_H],
      ]
      if (corners.every(([cx, cy]) => Math.hypot(cx, cy) < R - 5)) {
        // deterministic pseudo-random tint for an iridescent look
        const tint = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) % 1
        out.push({ x, y, tint })
      }
    }
  }
  return out
})()

/** A stylised 300 mm silicon wafer covered in dies. */
export const Wafer = memo(function Wafer({ className }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} role="img" aria-label="A silicon wafer covered in a grid of identical chips (dies)">
      <defs>
        <radialGradient id="wafer-base" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#3a4654" />
          <stop offset="55%" stopColor="#1b232d" />
          <stop offset="100%" stopColor="#0d1218" />
        </radialGradient>
        <linearGradient id="die-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2b5d6e" />
          <stop offset="100%" stopColor="#1a2f3d" />
        </linearGradient>
        <linearGradient id="die-b" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3b3f6e" />
          <stop offset="100%" stopColor="#1d2238" />
        </linearGradient>
        <linearGradient id="die-c" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#245f5a" />
          <stop offset="100%" stopColor="#15302f" />
        </linearGradient>
        <pattern id="die-lines" width="2" height="2" patternUnits="userSpaceOnUse">
          <path d="M0 1h2" stroke="#ffffff" strokeOpacity=".06" strokeWidth=".4" />
        </pattern>
      </defs>

      <circle r={R} fill="url(#wafer-base)" stroke="#5c6b7a" strokeOpacity=".6" strokeWidth=".8" />
      <g>
        {dies.map((d) => (
          <g key={`${d.x}:${d.y}`}>
            <rect
              x={d.x}
              y={d.y}
              width={DIE_W}
              height={DIE_H}
              rx={0.6}
              fill={d.tint < 0.33 ? 'url(#die-a)' : d.tint < 0.66 ? 'url(#die-b)' : 'url(#die-c)'}
              stroke="#7dd3fc"
              strokeOpacity=".18"
              strokeWidth=".3"
            />
            <rect x={d.x + 1.5} y={d.y + 1.5} width={DIE_W - 3} height={DIE_H - 3} fill="url(#die-lines)" />
          </g>
        ))}
      </g>
      {/* orientation notch */}
      <circle cx="0" cy={R} r="3" fill="#05070a" />
    </svg>
  )
})

/** Fixed specular highlight that sits above the rotating wafer. */
export function WaferSheen({ className }: { className?: string }) {
  return (
    <svg viewBox="-100 -100 200 200" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a5f3fc" stopOpacity=".28" />
          <stop offset="35%" stopColor="#a5f3fc" stopOpacity="0" />
          <stop offset="60%" stopColor="#c4b5fd" stopOpacity=".1" />
          <stop offset="100%" stopColor="#f2a54a" stopOpacity=".12" />
        </linearGradient>
      </defs>
      <circle r={R} fill="url(#sheen)" />
    </svg>
  )
}
