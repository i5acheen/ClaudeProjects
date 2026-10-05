import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { geoPins, layers, sectionIntros } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { SimplifiedNote } from '../../components/SimplifiedNote'
import { accentHex } from '../../components/accent'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { MAP_VIEWBOX, landPaths, projectLonLat } from './worldShapes'

const layerName = (id: string) => layers.find((l) => l.id === id)?.name ?? id

export function Geography() {
  const reduce = useReducedMotion()
  const [selected, setSelected] = useState('taiwan')
  const [hovered, setHovered] = useState<string | null>(null)
  const active = geoPins.find((p) => p.id === (hovered ?? selected))!
  // pins and labels scale up on small screens so they stay tappable and readable
  const k = useMediaQuery('(min-width: 640px)') ? 1 : 2.4

  return (
    <Section id="map">
      <div className="container-x">
        <SectionHeading id="map-title" {...sectionIntros.map} />

        <div className="grid items-start gap-6 lg:grid-cols-[2.1fr_1fr]">
          <div className="card relative overflow-hidden p-3 md:p-5 lg:sticky lg:top-20">
            <svg viewBox={MAP_VIEWBOX} className="w-full" role="group" aria-label="Stylised world map with pins where key semiconductor layers are concentrated">
              <defs>
                <pattern id="land-dots" width="7" height="7" patternUnits="userSpaceOnUse">
                  <circle cx="3.5" cy="3.5" r="1.5" fill="#64748b" fillOpacity=".55" />
                </pattern>
              </defs>
              {landPaths.map((d, i) => (
                <g key={i}>
                  <path d={d} fill="#94a3b8" fillOpacity=".04" />
                  <path d={d} fill="url(#land-dots)" />
                </g>
              ))}

              {geoPins.map((pin, i) => {
                const [x, y] = projectLonLat(pin.lon, pin.lat)
                const color = accentHex[pin.accent]
                const isActive = pin.id === active.id
                return (
                  <g
                    key={pin.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={pin.id === selected}
                    aria-label={`${pin.country}: ${pin.line}`}
                    className="cursor-pointer outline-none"
                    onClick={() => setSelected(pin.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelected(pin.id)
                      }
                    }}
                    onMouseEnter={() => setHovered(pin.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(pin.id)}
                    onBlur={() => setHovered(null)}
                  >
                    {!reduce && (
                      <motion.circle
                        cx={x}
                        cy={y}
                        r={8 * k}
                        fill="none"
                        stroke={color}
                        initial={{ scale: 0.6, opacity: 0.8 }}
                        animate={{ scale: 2.6, opacity: 0 }}
                        transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.25, ease: 'easeOut' }}
                        style={{ transformOrigin: `${x}px ${y}px` }}
                      />
                    )}
                    <circle cx={x} cy={y} r={14 * k} fill="transparent" />
                    <motion.circle
                      cx={x}
                      cy={y}
                      initial={{ r: 0 }}
                      whileInView={{ r: (isActive ? 8 : 6) * k }}
                      animate={{ r: (isActive ? 8 : 6) * k }}
                      viewport={{ once: true }}
                      transition={{ type: 'spring', stiffness: 260, damping: 16, delay: reduce ? 0 : i * 0.06 }}
                      fill={color}
                      stroke="#05070a"
                      strokeWidth="2"
                    />
                    {isActive && <PinLabel x={x} y={y} k={k} text={pin.country} color={color} />}
                  </g>
                )
              })}
            </svg>

            <div aria-live="polite" className="mt-3 rounded-xl border border-line bg-ink/70 p-4">
              <p className="font-semibold" style={{ color: accentHex[active.accent] }}>
                {active.country}
              </p>
              <p className="mt-1 text-fg">{active.line}</p>
              <p className="mt-2 text-xs text-faint">Layers: {active.layers.map(layerName).join(' · ')}</p>
            </div>
          </div>

          <ul className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-1" aria-label="Locations">
            {geoPins.map((pin) => {
              const isSel = pin.id === selected
              return (
                <li key={pin.id}>
                  <button
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => setSelected(pin.id)}
                    onMouseEnter={() => setHovered(pin.id)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex w-full gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${isSel ? 'border-white/20 bg-white/[0.05]' : 'border-line hover:bg-white/[0.03]'}`}
                  >
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: accentHex[pin.accent] }} aria-hidden="true" />
                    <span>
                      <span className="block font-semibold text-fg">{pin.country}</span>
                      <span className="block text-sm leading-snug text-muted">{pin.line}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <SimplifiedNote>Simplified map; pins mark broad regions, not exact sites. Each country hosts several layers.</SimplifiedNote>
      </div>
    </Section>
  )
}

function PinLabel({ x, y, k, text, color }: { x: number; y: number; k: number; text: string; color: string }) {
  const w = (text.length * 9 + 18) * k
  const flip = x > 700 // keep labels near the right edge inside the map
  const left = flip ? x - 12 * k - w : x + 12 * k
  return (
    <g pointerEvents="none">
      <rect x={left} y={y - 30 * k} width={w} height={24 * k} rx={6 * k} fill="#05070a" stroke={color} strokeOpacity=".7" />
      <text x={left + 9 * k} y={y - 13 * k} fill="#e8eef4" fontSize={14 * k} fontWeight="600">
        {text}
      </text>
    </g>
  )
}
