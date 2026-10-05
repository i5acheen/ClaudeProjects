import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useScroll, useTransform } from 'framer-motion'
import { journey } from '../../data/industry'
import { ChipToken } from './ChipToken'
import { StationDot, StationText } from './StationCard'

const STEP = 360 // px between stations
const CARD = 310
const last = journey.length - 1

/** Map scroll progress to track position, pausing briefly at each station. */
function dwell(v: number): number {
  const seg = Math.min(Math.max(v, 0), 1) * last
  const i = Math.min(Math.floor(seg), last - 1)
  const f = Math.min(Math.max((seg - i - 0.25) / 0.5, 0), 1)
  return i + f * f * (3 - 2 * f) // smoothstep between stations
}

/** Desktop: vertical scrolling drives a horizontal track past a travelling chip token. */
export function JourneyHorizontal() {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })
  const x = useTransform(scrollYProgress, (v) => -dwell(v) * STEP)
  const fill = useTransform(scrollYProgress, (v) => dwell(v) * STEP)
  const [active, setActive] = useState(0)

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.round(dwell(v))
    setActive((prev) => (prev === i ? prev : i))
  })

  return (
    <div ref={ref} style={{ height: `${journey.length * 55 + 60}vh` }} className="relative">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        {/* Stage counter */}
        <div className="container-x mb-10 flex items-center justify-between text-sm text-faint">
          <span>
            Stop <span className="tabular-nums text-fg">{active + 1}</span> / {journey.length}
          </span>
          <span className="hidden lg:inline">Keep scrolling to move the chip →</span>
        </div>

        <div className="relative" style={{ ['--pad' as string]: 'min(30vw, 440px)' }}>
          {/* travelling chip, fixed on screen while the track moves */}
          <div className="pointer-events-none absolute top-0 z-10 -translate-x-1/2" style={{ left: 'var(--pad)' }}>
            <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}>
              <ChipToken stop={journey[active]} />
            </motion.div>
            <span aria-hidden="true" className="mx-auto mt-2 block h-5 w-px bg-gradient-to-b from-white/40 to-transparent" />
          </div>

          <motion.ol
            style={{ x, paddingLeft: 'var(--pad)' }}
            className="relative flex pt-20"
            aria-label="Journey of an AI chip, ten stops"
          >
            {/* rail */}
            <span aria-hidden="true" className="absolute top-[104px] h-px bg-white/10" style={{ left: 'var(--pad)', width: last * STEP }} />
            <motion.span
              aria-hidden="true"
              className="absolute top-[103.5px] h-0.5 bg-gradient-to-r from-slate via-cyan to-amber"
              style={{ left: 'var(--pad)', width: fill }}
            />
            {journey.map((stop, i) => (
              <li
                key={stop.id}
                aria-current={i === active ? 'step' : undefined}
                className="relative shrink-0"
                style={{ width: i === last ? CARD : STEP }}
              >
                <div className="-translate-x-1/2" style={{ width: CARD }}>
                  <div className="flex justify-center">
                    <StationDot stop={stop} active={i === active} passed={i < active} />
                  </div>
                  <div className="mt-6 px-2 text-center">
                    <StationText stop={stop} index={i} active={i === active} />
                  </div>
                </div>
              </li>
            ))}
          </motion.ol>
        </div>
      </div>
    </div>
  )
}
