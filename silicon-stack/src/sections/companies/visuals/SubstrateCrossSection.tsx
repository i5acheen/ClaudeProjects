import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '../../../hooks/useMediaQuery'

const X0 = 30
const X1 = 450
const CENTER = (X0 + X1) / 2
const SIGNALS = 8
const GAP = 14 // px each layer moves apart when exploded

type Kind = 'die' | 'bumps' | 'buildup' | 'core' | 'balls' | 'board'
interface Layer {
  id: string
  kind: Kind
  h: number
  /** Signal pitch entering (top) and leaving (bottom) this layer. */
  pitchIn: number
  pitchOut: number
  label?: string
  note?: string
}

const layers: Layer[] = [
  { id: 'die', kind: 'die', h: 34, pitchIn: 18, pitchOut: 18, label: 'Chip (die)', note: 'Thousands of tiny contacts' },
  { id: 'bumps', kind: 'bumps', h: 12, pitchIn: 18, pitchOut: 18, label: 'Micro-bumps', note: 'Solder joints to the substrate' },
  { id: 'bu1', kind: 'buildup', h: 22, pitchIn: 18, pitchOut: 26, label: 'Build-up layers', note: 'ABF film + fine copper lines' },
  { id: 'bu2', kind: 'buildup', h: 22, pitchIn: 26, pitchOut: 34 },
  { id: 'core', kind: 'core', h: 40, pitchIn: 34, pitchOut: 34, label: 'Core', note: 'Stiff centre, plated holes' },
  { id: 'bu3', kind: 'buildup', h: 22, pitchIn: 34, pitchOut: 43, label: 'Build-up layers', note: 'Copper fans out wider' },
  { id: 'bu4', kind: 'buildup', h: 22, pitchIn: 43, pitchOut: 52 },
  { id: 'balls', kind: 'balls', h: 22, pitchIn: 52, pitchOut: 52, label: 'Solder balls (BGA)', note: 'Much wider spacing' },
  { id: 'board', kind: 'board', h: 30, pitchIn: 52, pitchOut: 52, label: 'Circuit board', note: 'The server’s main board' },
]

const xs = (pitch: number) => Array.from({ length: SIGNALS }, (_, k) => CENTER + (k - (SIGNALS - 1) / 2) * pitch)

// collapsed top y for each layer
const tops = (() => {
  let y = 78
  return layers.map((l) => {
    const t = y
    y += l.h
    return t
  })
})()

const COPPER = '#f2a54a'
const LABEL_X = 488
const LABEL_TOP = 40
const LABEL_STEP = 50
const labelled = layers.map((l, i) => ({ l, i })).filter(({ l }) => l.label)

export function SubstrateCrossSection() {
  const reduce = useReducedMotion()
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const exploded = reduce || hover || pinned
  const mid = (layers.length - 1) / 2
  const wide = useMediaQuery('(min-width: 640px)')

  return (
    <div>
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
        <svg viewBox={wide ? '0 0 640 380' : '6 10 468 360'} className="w-full" role="img" aria-labelledby="sub-title sub-desc">
          <title id="sub-title">Cross-section of a multilayer IC substrate</title>
          <desc id="sub-desc">
            A chip sits on micro-bumps on top of the substrate. Copper traces and vias run through several build-up layers and a core, spreading the connections from the chip’s tight spacing out to wider solder balls that connect to the circuit board.
          </desc>
          <defs>
            <pattern id="core-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="#475569" strokeOpacity=".5" strokeWidth="2" />
            </pattern>
            <linearGradient id="die-grad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#334155" />
              <stop offset="1" stopColor="#1e293b" />
            </linearGradient>
          </defs>

          {/* dashed continuity lines that appear between separated layers */}
          {layers.slice(0, -1).map((l, i) => (
            <motion.g key={`c-${l.id}`} initial={false} animate={{ opacity: exploded ? 0.6 : 0 }}>
              {xs(l.pitchOut).map((x, k) => {
                const y = tops[i] + l.h + (i - mid) * (exploded ? GAP : 0)
                return <line key={k} x1={x} x2={x} y1={y} y2={y + GAP} stroke={COPPER} strokeDasharray="2 3" strokeWidth="1.2" />
              })}
            </motion.g>
          ))}

          {layers.map((l, i) => (
            <motion.g
              key={l.id}
              initial={false}
              animate={{ y: exploded ? (i - mid) * GAP : 0 }}
              transition={{ type: 'spring', stiffness: 110, damping: 17 }}
            >
              <LayerShape layer={l} top={tops[i]} drawn={exploded} reduce={!!reduce} />
            </motion.g>
          ))}

          {/* fixed label column with leader lines that follow each layer */}
          {labelled.map(({ l, i }, n) => {
            const ly = LABEL_TOP + n * LABEL_STEP
            const ay = tops[i] + l.h / 2 + (exploded ? (i - mid) * GAP : 0)
            return (
              <g key={l.id} className="hidden sm:block">
                <motion.polyline
                  initial={false}
                  animate={{ points: `${X1 + 6},${ay} ${X1 + 22},${ay} ${LABEL_X - 6},${ly}` }}
                  transition={{ type: 'spring', stiffness: 110, damping: 17 }}
                  fill="none"
                  stroke="#94a3b8"
                  strokeOpacity=".4"
                />
                <text x={LABEL_X} y={ly - 1} fill="#e8eef4" fontSize="13" fontWeight="600">
                  {l.label}
                </text>
                <text x={LABEL_X} y={ly + 14} fill="#9ba8b5" fontSize="11">
                  {l.note}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!reduce && (
          <button
            type="button"
            aria-pressed={pinned}
            onClick={() => setPinned((p) => !p)}
            className="rounded-full border border-amber/50 px-4 py-1.5 text-sm font-medium text-amber hover:bg-amber/10"
          >
            {pinned ? 'Close the layers' : 'Slide layers apart'}
          </button>
        )}
        <p className="text-sm text-muted">
          <span className="font-medium text-amber">Copper</span> routing spreads connections from the chip’s tight spacing to the board’s wider spacing.
        </p>
      </div>
    </div>
  )
}

function LayerShape({ layer, top, drawn, reduce }: { layer: Layer; top: number; drawn: boolean; reduce: boolean }) {
  const bottom = top + layer.h
  const inX = xs(layer.pitchIn)
  const outX = xs(layer.pitchOut)

  switch (layer.kind) {
    case 'die':
      return (
        <g>
          <rect x={CENTER - 92} y={top} width={184} height={layer.h} rx="3" fill="url(#die-grad)" stroke="#64748b" />
          <rect x={CENTER - 84} y={bottom - 8} width={168} height={5} fill="#22d3ee" fillOpacity=".25" />
          <text x={CENTER} y={top + 18} textAnchor="middle" fill="#cbd5e1" fontSize="11">
            transistors &amp; wiring
          </text>
        </g>
      )
    case 'bumps':
      return (
        <g>
          {inX.map((x) => (
            <circle key={x} cx={x} cy={top + layer.h / 2} r="5" fill="#cbd5e1" />
          ))}
        </g>
      )
    case 'buildup':
      return (
        <g>
          <rect x={X0} y={top} width={X1 - X0} height={layer.h} fill="#16202b" stroke="#2b3a4a" />
          {inX.map((x, k) => (
            <motion.path
              key={k}
              d={`M ${x} ${top + 3} H ${outX[k]} V ${bottom}`}
              fill="none"
              stroke={COPPER}
              strokeWidth="3"
              strokeLinejoin="round"
              initial={false}
              animate={{ pathLength: reduce || !drawn ? 1 : [0, 1] }}
              transition={{ duration: 0.8, delay: 0.1 + k * 0.04 }}
            />
          ))}
        </g>
      )
    case 'core':
      return (
        <g>
          <rect x={X0} y={top} width={X1 - X0} height={layer.h} fill="#1b2530" stroke="#2b3a4a" />
          <rect x={X0} y={top} width={X1 - X0} height={layer.h} fill="url(#core-hatch)" />
          {inX.map((x) => (
            <g key={x}>
              <rect x={x - 5} y={top} width="10" height={layer.h} fill={COPPER} fillOpacity=".9" />
              <rect x={x - 2} y={top + 2} width="4" height={layer.h - 4} fill="#0b1016" />
            </g>
          ))}
        </g>
      )
    case 'balls':
      return (
        <g>
          {inX.map((x) => (
            <circle key={x} cx={x} cy={top + layer.h / 2} r="10" fill="#cbd5e1" />
          ))}
        </g>
      )
    case 'board':
      return (
        <g>
          <rect x={X0 - 14} y={top} width={X1 - X0 + 28} height={layer.h} rx="3" fill="#13261d" stroke="#25483a" />
          {inX.map((x) => (
            <rect key={x} x={x - 10} y={top} width="20" height="3" fill={COPPER} />
          ))}
          <path d={`M ${X0 - 6} ${top + 16} H ${X1 + 6}`} stroke={COPPER} strokeOpacity=".5" strokeWidth="2" />
        </g>
      )
  }
}
