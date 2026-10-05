import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'framer-motion'

type Pt = [number, number]

// Light path: source → illuminator mirrors → mask → projection mirrors → wafer
const SOURCE: Pt = [112, 272]
const M1: Pt = [230, 72]
const M2: Pt = [312, 168]
const MASK: Pt = [402, 50]
const P1: Pt = [474, 172]
const P2: Pt = [412, 238]
const WAFER: Pt = [500, 316]
const points: Pt[] = [SOURCE, M1, M2, MASK, P1, P2, WAFER]
const pathD = `M ${points.map((p) => p.join(' ')).join(' L ')}`

/** Cumulative fraction of path length at each point, used to sync the step highlights. */
const fractions = (() => {
  const seg = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]))
  const total = seg.reduce((a, b) => a + b, 0)
  let acc = 0
  return [0, ...seg.map((s) => (acc += s) / total)]
})()

const steps = [
  { n: 1, title: 'Light source', body: 'A powerful laser hits tiny droplets of molten tin many thousands of times per second, creating a plasma that glows with 13.5 nm EUV light.', at: 0 },
  { n: 2, title: 'Collector & illuminator mirrors', body: 'Ultra-smooth mirrors gather and shape the light. EUV is absorbed by glass and even air, so there are no lenses — only mirrors, in a vacuum.', at: 1 },
  { n: 3, title: 'Mask (reticle)', body: 'A reflective mask carries the pattern for one layer of the chip.', at: 3 },
  { n: 4, title: 'Projection mirrors', body: 'More mirrors shrink the pattern by 4× and focus it with nanometre precision.', at: 4 },
  { n: 5, title: 'Wafer', body: 'The image is printed into a light-sensitive coating on the wafer, field by field, as the wafer stage scans back and forth.', at: 6 },
]

/** Orientation of a mirror at point i: perpendicular to the bisector of in- and out-going rays. */
function mirrorAt(i: number, half = 22) {
  const [px, py] = points[i - 1]
  const [cx, cy] = points[i]
  const [nx, ny] = points[i + 1]
  const a = norm([cx - px, cy - py])
  const b = norm([nx - cx, ny - cy])
  const n = norm([b[0] - a[0], b[1] - a[1]]) // surface normal
  const t: Pt = [-n[1], n[0]]
  const back: Pt = [cx - n[0] * 4, cy - n[1] * 4]
  return { x1: back[0] - t[0] * half, y1: back[1] - t[1] * half, x2: back[0] + t[0] * half, y2: back[1] + t[1] * half }
}
function norm([x, y]: Pt): Pt {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}

export function EuvMachine() {
  const reduce = useReducedMotion()
  const t = useMotionValue(reduce ? 1 : 0)
  const pathRef = useRef<SVGPathElement>(null)
  const hx = useMotionValue(SOURCE[0])
  const hy = useMotionValue(SOURCE[1])
  const [active, setActive] = useState(reduce ? -1 : 0)
  const dash = useTransform(t, (v) => `${v} 1`)

  useEffect(() => {
    if (reduce) return
    const controls = animate(t, [0, 1, 1], { duration: 5.5, times: [0, 0.82, 1], ease: 'linear', repeat: Infinity })
    return () => controls.stop()
  }, [reduce, t])

  useMotionValueEvent(t, 'change', (v) => {
    const path = pathRef.current
    if (!path) return
    const p = path.getPointAtLength(v * path.getTotalLength())
    hx.set(p.x)
    hy.set(p.y)
    let idx = 0
    steps.forEach((s, i) => {
      if (v >= fractions[s.at] - 0.001) idx = i
    })
    setActive((prev) => (prev === idx ? prev : idx))
  })

  return (
    <div>
      <svg viewBox="0 0 620 360" className="w-full" role="img" aria-labelledby="euv-title euv-desc">
        <title id="euv-title">Simplified EUV lithography machine</title>
        <desc id="euv-desc">
          Light is created by a laser hitting tin droplets, reflected by collector and illuminator mirrors onto a patterned mask, then by projection mirrors down onto the wafer. All inside a vacuum.
        </desc>
        <defs>
          <linearGradient id="mirror" x1="0" x2="1">
            <stop offset="0" stopColor="#cffafe" />
            <stop offset="1" stopColor="#67e8f9" />
          </linearGradient>
          <radialGradient id="plasma">
            <stop offset="0" stopColor="#ecfeff" />
            <stop offset=".4" stopColor="#22d3ee" stopOpacity=".8" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* vacuum chamber */}
        <rect x="14" y="14" width="592" height="332" rx="18" fill="#0a1218" stroke="#22d3ee" strokeOpacity=".25" strokeDasharray="6 6" />
        <text x="30" y="38" fill="#6b7886" fontSize="12" letterSpacing="1.5">VACUUM CHAMBER</text>

        {/* CO2 laser */}
        <line x1="20" y1="336" x2={SOURCE[0]} y2={SOURCE[1]} stroke="#f87171" strokeWidth="3" strokeOpacity=".7" />
        <text x="26" y="324" fill="#fca5a5" fontSize="11" transform="rotate(-29 26 324)">laser</text>

        {/* tin droplets */}
        {!reduce &&
          [0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={SOURCE[0]}
              r="2.5"
              fill="#cbd5e1"
              initial={{ cy: 200 }}
              animate={{ cy: [200, SOURCE[1]], opacity: [1, 1, 0] }}
              transition={{ duration: 0.9, delay: i * 0.3, repeat: Infinity, ease: 'linear' }}
            />
          ))}
        <rect x={SOURCE[0] - 7} y="186" width="14" height="10" rx="2" fill="#334155" />

        {/* collector mirror */}
        <path d={`M ${SOURCE[0] - 18} ${SOURCE[1] + 40} Q ${SOURCE[0] - 46} ${SOURCE[1]} ${SOURCE[0] - 18} ${SOURCE[1] - 40}`} fill="none" stroke="url(#mirror)" strokeWidth="5" strokeLinecap="round" />

        {/* plasma */}
        <motion.circle
          cx={SOURCE[0]}
          cy={SOURCE[1]}
          r="16"
          fill="url(#plasma)"
          animate={reduce ? undefined : { scale: [0.8, 1.25, 0.8], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 0.3, repeat: Infinity }}
          style={{ transformOrigin: `${SOURCE[0]}px ${SOURCE[1]}px` }}
        />

        {/* beam: faint full path + bright travelled portion */}
        <path ref={pathRef} d={pathD} fill="none" stroke="#22d3ee" strokeOpacity=".15" strokeWidth="6" strokeLinejoin="round" />
        <motion.path d={pathD} pathLength={1} fill="none" stroke="#67e8f9" strokeWidth="3" strokeLinejoin="round" filter="url(#glow)" style={{ strokeDasharray: dash }} />

        {/* mirrors */}
        {[1, 2, 4, 5].map((i) => {
          const m = mirrorAt(i)
          return <line key={i} {...m} stroke="url(#mirror)" strokeWidth="6" strokeLinecap="round" />
        })}

        {/* mask on reticle stage */}
        {(() => {
          const m = mirrorAt(3, 34)
          return (
            <g>
              <line {...m} stroke="#e2e8f0" strokeWidth="9" strokeLinecap="round" />
              <line {...m} stroke="#22d3ee" strokeWidth="9" strokeDasharray="3 4" strokeOpacity=".7" />
            </g>
          )
        })()}

        {/* wafer on scanning stage */}
        <motion.g animate={reduce ? undefined : { x: [-14, 14, -14] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}>
          <rect x={WAFER[0] - 70} y={WAFER[1] + 10} width="140" height="14" rx="3" fill="#1e293b" stroke="#334155" />
          <ellipse cx={WAFER[0]} cy={WAFER[1] + 5} rx="58" ry="7" fill="#64748b" stroke="#a5f3fc" strokeOpacity=".5" />
        </motion.g>

        {/* photon packet */}
        {!reduce && <motion.circle cx={hx} cy={hy} r="6" fill="#ecfeff" filter="url(#glow)" />}

        {/* numbered markers */}
        {steps.map((s, i) => {
          const [x, y] = points[s.at]
          const offset: Pt = [[-6, 44], [-34, -6], [30, -2], [36, 0], [76, 10]][i] as Pt
          const on = reduce || i === active
          return (
            <g key={s.n} transform={`translate(${x + offset[0]} ${y + offset[1]})`}>
              <circle r="11" fill={on ? '#22d3ee' : '#0b1016'} stroke="#22d3ee" strokeOpacity={on ? 1 : 0.5} />
              <text textAnchor="middle" dy="4" fontSize="12" fontWeight="600" fill={on ? '#05070a' : '#67e8f9'}>
                {s.n}
              </text>
            </g>
          )
        })}
      </svg>

      <ol className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {steps.map((s, i) => {
          const on = reduce || i === active
          return (
            <li
              key={s.n}
              className={`flex gap-3 rounded-xl border p-3 transition-colors duration-300 ${
                on ? 'border-cyan/50 bg-cyan/[0.07]' : 'border-line bg-transparent'
              } ${i === steps.length - 1 ? 'sm:col-span-2 lg:col-span-1 xl:col-span-2' : ''}`}
            >
              <span className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${on ? 'bg-cyan text-ink' : 'border border-cyan/40 text-cyan'}`}>
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-fg">{s.title}</span>
                <span className="block text-sm leading-relaxed text-muted">{s.body}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
