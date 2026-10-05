import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { project, slabFaces, type Slab } from './iso'

const CX = 236
const CY = 250

interface Part {
  id: string
  label: string
  detail: string
  colors: { top: string; left: string; right: string; stroke: string }
  slabs: Slab[]
  /** How far the part lifts (px) when exploded. */
  lift: number
  stripes?: boolean
}

const SUB_H = 14
const INT_H = 8
const SUB = 220
const parts: Part[] = [
  {
    id: 'substrate',
    label: 'IC substrate',
    detail: 'Routes signals & power to the board (e.g. AT&S, Ibiden, Unimicron)',
    colors: { top: '#3a2a17', left: '#2a1e10', right: '#1f160b', stroke: '#f2a54a' },
    slabs: [{ x: 0, y: 0, w: SUB, d: SUB, h: SUB_H, z: 0 }],
    lift: 0,
  },
  {
    id: 'interposer',
    label: 'Silicon interposer',
    detail: 'Ultra-dense wiring linking GPU and memory (CoWoS)',
    colors: { top: '#3b4a5c', left: '#2a3644', right: '#1f2833', stroke: '#94a3b8' },
    slabs: [{ x: 0, y: 0, w: 210, d: 170, h: INT_H, z: SUB_H }],
    lift: 56,
  },
  {
    id: 'hbm',
    label: 'HBM stacks',
    detail: 'Stacked DRAM memory (SK hynix, Micron, Samsung)',
    colors: { top: '#1d4e57', left: '#153a41', right: '#0f2c31', stroke: '#2dd4bf' },
    slabs: [
      { x: -82, y: -38, w: 38, d: 50, h: 24, z: SUB_H + INT_H },
      { x: -82, y: 38, w: 38, d: 50, h: 24, z: SUB_H + INT_H },
      { x: 82, y: -38, w: 38, d: 50, h: 24, z: SUB_H + INT_H },
    ],
    lift: 112,
    stripes: true,
  },
  {
    id: 'die',
    label: 'GPU die',
    detail: 'The processor itself, made by TSMC',
    colors: { top: '#25411a', left: '#1b3013', right: '#13230d', stroke: '#76b900' },
    slabs: [{ x: 0, y: 0, w: 104, d: 130, h: 12, z: SUB_H + INT_H }],
    lift: 112,
  },
  {
    // drawn last so it sits in front of the die
    id: 'hbm-front',
    label: '',
    detail: '',
    colors: { top: '#1d4e57', left: '#153a41', right: '#0f2c31', stroke: '#2dd4bf' },
    slabs: [{ x: 82, y: 38, w: 38, d: 50, h: 24, z: SUB_H + INT_H }],
    lift: 112,
    stripes: true,
  },
]

const labelled = parts.filter((p) => p.label)

export function GpuExploded() {
  const reduce = useReducedMotion()
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const exploded = reduce || hover || pinned
  const wide = useMediaQuery('(min-width: 640px)')

  return (
    <div>
      <div
        className="relative"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <svg viewBox={wide ? '0 0 620 380' : '30 20 420 360'} className="w-full" role="img" aria-labelledby="gpu-title gpu-desc">
          <title id="gpu-title">Exploded view of an AI GPU package</title>
          <desc id="gpu-desc">
            From bottom to top: an IC substrate, a silicon interposer, then the GPU die in the centre with stacks of HBM memory beside it.
          </desc>

          {/* solder balls under the substrate */}
          {Array.from({ length: 9 }, (_, i) => {
            const [x, y] = project(-SUB / 2 + 12 + i * 24.5, SUB / 2, -4, CX, CY)
            return <circle key={`b${i}`} cx={x} cy={y} r="4" fill="#cbd5e1" fillOpacity=".7" />
          })}
          {Array.from({ length: 9 }, (_, i) => {
            const [x, y] = project(SUB / 2, -SUB / 2 + 12 + i * 24.5, -4, CX, CY)
            return <circle key={`r${i}`} cx={x} cy={y} r="4" fill="#cbd5e1" fillOpacity=".5" />
          })}

          {parts.map((part) => (
            <motion.g key={part.id} animate={{ y: exploded ? -part.lift : 0 }} transition={{ type: 'spring', stiffness: 120, damping: 18 }}>
              {part.slabs.map((s, i) => {
                const f = slabFaces(s, CX, CY)
                return (
                  <g key={i} stroke={part.colors.stroke} strokeOpacity=".7" strokeWidth="1" strokeLinejoin="round">
                    <polygon points={f.left} fill={part.colors.left} />
                    <polygon points={f.right} fill={part.colors.right} />
                    <polygon points={f.top} fill={part.colors.top} />
                    {part.stripes &&
                      [1, 2, 3, 4, 5, 6, 7].map((k) => {
                        const z = s.z + (s.h / 8) * k
                        const a = project(s.x - s.w / 2, s.y + s.d / 2, z, CX, CY)
                        const b = project(s.x + s.w / 2, s.y + s.d / 2, z, CX, CY)
                        const c = project(s.x + s.w / 2, s.y - s.d / 2, z, CX, CY)
                        return <polyline key={k} points={`${a} ${b} ${c}`} fill="none" strokeOpacity=".45" strokeWidth=".8" />
                      })}
                    {part.id === 'die' && <DieDetail s={s} />}
                    {part.id === 'substrate' && <SubstrateDetail s={s} />}
                  </g>
                )
              })}
            </motion.g>
          ))}

          {/* labels */}
          {labelled.map((part, i) => {
            const s = part.slabs[0]
            const anchor = project(s.x + s.w / 2, s.y, s.z + s.h / 2, CX, CY)
            const ly = [318, 236, 120, 168][i]
            return (
              <motion.g
                key={part.id}
                className="hidden sm:block"
                initial={false}
                animate={{ opacity: exploded ? 1 : 0, y: exploded ? -part.lift : 0 }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
              >
                <line x1={anchor[0] + 4} y1={anchor[1]} x2="452" y2={ly + part.lift} stroke="#94a3b8" strokeOpacity=".4" strokeDasharray="3 3" />
                <text x="458" y={ly + part.lift - 4} fill="#e8eef4" fontSize="14" fontWeight="600">
                  {part.label}
                </text>
                <foreignObject x="458" y={ly + part.lift + 2} width="160" height="44">
                  <p className="text-[11px] leading-tight text-muted">{part.detail}</p>
                </foreignObject>
              </motion.g>
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
            className="rounded-full border border-nvgreen/50 px-4 py-1.5 text-sm font-medium text-nvgreen hover:bg-nvgreen/10"
          >
            {pinned ? 'Reassemble package' : 'Explode package'}
          </button>
        )}
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted sm:hidden">
          {labelled.map((p) => (
            <li key={p.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: p.colors.stroke }} aria-hidden="true" />
              {p.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function DieDetail({ s }: { s: Slab }) {
  const z = s.z + s.h
  const lines = []
  for (let k = 1; k < 6; k++) {
    const yy = s.y - s.d / 2 + (s.d / 6) * k
    const a = project(s.x - s.w / 2 + 8, yy, z, CX, CY)
    const b = project(s.x + s.w / 2 - 8, yy, z, CX, CY)
    lines.push(<line key={k} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#76b900" strokeOpacity=".35" />)
  }
  return <g>{lines}</g>
}

function SubstrateDetail({ s }: { s: Slab }) {
  const z = s.z + s.h
  const dots = []
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 6; j++) {
      const [x, y] = project(s.x - s.w / 2 + 14 + i * 38, s.y - s.d / 2 + 14 + j * 38, z, CX, CY)
      dots.push(<circle key={`${i}-${j}`} cx={x} cy={y} r="1.6" fill="#f2a54a" fillOpacity=".6" stroke="none" />)
    }
  }
  return <g>{dots}</g>
}
