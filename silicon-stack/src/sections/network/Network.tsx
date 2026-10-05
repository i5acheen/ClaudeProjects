import { useMemo, useState, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MousePointerClick } from 'lucide-react'
import { networkEdges, networkFootnote, networkNodes, sectionIntros } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { accentHex } from '../../components/accent'
import { relations } from './graph'

const W = 150
const H = 50
const UP = '#22d3ee'
const DOWN = '#f2a54a'
const byId = Object.fromEntries(networkNodes.map((n) => [n.id, n]))

const columns = [
  { x: 80, label: 'Equipment' },
  { x: 290, label: 'Chips & memory' },
  { x: 500, label: 'Substrates' },
  { x: 690, label: 'Design & packaging' },
  { x: 870, label: 'Systems' },
  { x: 1040, label: 'Customers' },
]

function edgePath(fromId: string, toId: string) {
  const a = byId[fromId]
  const b = byId[toId]
  if (Math.abs(a.x - b.x) < 10) {
    // same column: connect bottom/top edges vertically
    const [y1, y2] = a.y > b.y ? [a.y - H / 2, b.y + H / 2] : [a.y + H / 2, b.y - H / 2]
    return `M ${a.x} ${y1} C ${a.x} ${(y1 + y2) / 2}, ${b.x} ${(y1 + y2) / 2}, ${b.x} ${y2}`
  }
  const x1 = a.x + W / 2
  const x2 = b.x - W / 2
  const mx = (x1 + x2) / 2
  return `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`
}

export function Network() {
  const reduce = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const active = hovered ?? pinned
  const rel = useMemo(() => (active ? relations(active) : null), [active])

  const nodeState = (id: string) => {
    if (!rel || !active) return 'idle'
    if (id === active) return 'active'
    if (rel.upstreamNodes.has(id)) return 'up'
    if (rel.downstreamNodes.has(id)) return 'down'
    return 'dim'
  }

  const toggle = (id: string) => setPinned((p) => (p === id ? null : id))
  const onKey = (e: KeyboardEvent, id: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(id)
    }
  }

  return (
    <Section id="network">
      <div className="container-x">
        <SectionHeading id="network-title" {...sectionIntros.network} />

        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted">
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-6 rounded" style={{ background: UP }} aria-hidden="true" /> Upstream suppliers
          </span>
          <span className="flex items-center gap-2">
            <span className="h-0.5 w-6 rounded" style={{ background: DOWN }} aria-hidden="true" /> Downstream customers
          </span>
          <span className="flex items-center gap-2 text-faint">
            <MousePointerClick className="size-4" aria-hidden="true" /> Click to pin a selection
          </span>
        </div>

        <div className="card -mx-4 overflow-x-auto p-2 sm:mx-0 md:p-4">
          <svg viewBox="0 0 1120 520" className="min-w-[760px]" role="group" aria-label="Supply-chain dependency network">
            {columns.map((c) => (
              <text key={c.label} x={c.x} y="18" textAnchor="middle" fill="#6b7886" fontSize="12" letterSpacing="1.2">
                {c.label.toUpperCase()}
              </text>
            ))}

            {/* edges */}
            {networkEdges.map((e) => {
              const d = edgePath(e.from, e.to)
              const isUp = rel?.upstreamEdges.has(e)
              const isDown = rel?.downstreamEdges.has(e)
              const lit = isUp || isDown
              const color = isUp ? UP : isDown ? DOWN : '#9ba8b5'
              const opacity = !rel ? 0.28 : lit ? 0.9 : 0.06
              const id = `edge-${e.from}-${e.to}`
              return (
                <g key={id}>
                  <path id={id} d={d} fill="none" stroke={color} strokeOpacity={opacity} strokeWidth={lit ? 2.2 : 1.4} style={{ transition: 'stroke 0.25s, stroke-opacity 0.25s' }} />
                  {!reduce && (!rel || lit) && (
                    <circle r={lit ? 3.5 : 2.5} fill={lit ? color : '#cbd5e1'} fillOpacity={lit ? 1 : 0.6}>
                      <animateMotion dur={lit ? '1.6s' : '3.2s'} repeatCount="indefinite" begin={`${(e.from.length * 0.37 + e.to.length * 0.21) % 2}s`}>
                        <mpath href={`#${id}`} />
                      </animateMotion>
                    </circle>
                  )}
                </g>
              )
            })}

            {/* nodes */}
            {networkNodes.map((n) => {
              const state = nodeState(n.id)
              const color = accentHex[n.accent]
              const ring = state === 'active' ? color : state === 'up' ? UP : state === 'down' ? DOWN : 'rgba(255,255,255,0.14)'
              return (
                <motion.g
                  key={n.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={pinned === n.id}
                  aria-label={`${n.label}, ${n.role}. Highlight its suppliers and customers.`}
                  onMouseEnter={() => setHovered(n.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(n.id)}
                  onBlur={() => setHovered(null)}
                  onClick={() => toggle(n.id)}
                  onKeyDown={(e) => onKey(e, n.id)}
                  animate={{ opacity: state === 'dim' ? 0.28 : 1 }}
                  transition={{ duration: 0.2 }}
                  className="cursor-pointer outline-none"
                  style={{ transformBox: 'fill-box' }}
                >
                  <rect
                    x={n.x - W / 2}
                    y={n.y - H / 2}
                    width={W}
                    height={H}
                    rx="12"
                    fill={state === 'active' ? `${color}26` : '#0b1016'}
                    stroke={ring}
                    strokeWidth={state === 'idle' || state === 'dim' ? 1 : 2}
                  />
                  <rect x={n.x - W / 2 + 8} y={n.y - 8} width="4" height="16" rx="2" fill={color} />
                  <text x={n.x - W / 2 + 20} y={n.y - 3} fill="#e8eef4" fontSize="13.5" fontWeight="600">
                    {n.label}
                  </text>
                  <text x={n.x - W / 2 + 20} y={n.y + 13} fill="#9ba8b5" fontSize="10.5">
                    {n.role}
                  </text>
                </motion.g>
              )
            })}
          </svg>
        </div>
        <p className="mt-2 text-xs text-faint sm:hidden">Swipe the diagram sideways to see the full chain.</p>

        {/* Text alternative and detail panel; also the main control on touch devices */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p id="network-pick" className="mb-2 text-sm font-semibold uppercase tracking-wider text-fg">
              Pick a company
            </p>
            <div role="group" aria-labelledby="network-pick" className="flex flex-wrap gap-2">
              {networkNodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  aria-pressed={pinned === n.id}
                  onClick={() => toggle(n.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                    pinned === n.id ? 'border-cyan bg-cyan/15 text-fg' : 'border-line text-muted hover:text-fg'
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
          </div>

          <div aria-live="polite" className="card min-h-40 p-5">
            {active && rel ? (
              <>
                <p className="text-lg font-semibold text-fg">
                  {byId[active].label} <span className="text-sm font-normal text-muted">· {byId[active].role}</span>
                </p>
                <p className="mt-1 text-muted">{byId[active].note}</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <RelList title="Buys from" color={UP} items={rel.directSuppliers.map((e) => `${byId[e.from].label} — ${e.what}`)} empty="Top of this chain" />
                  <RelList title="Sells to" color={DOWN} items={rel.directCustomers.map((e) => `${byId[e.to].label} — ${e.what}`)} empty="End of this chain" />
                </div>
              </>
            ) : (
              <p className="text-muted">Hover, focus or tap a company to see who it depends on and who depends on it. Notice how many paths run through a single node.</p>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-faint">{networkFootnote}</p>
      </div>
    </Section>
  )
}

function RelList({ title, color, items, empty }: { title: string; color: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider" style={{ color }}>
        {title}
      </p>
      {items.length ? (
        <ul className="space-y-1 text-sm text-muted">
          {items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-faint">{empty}</p>
      )}
    </div>
  )
}
