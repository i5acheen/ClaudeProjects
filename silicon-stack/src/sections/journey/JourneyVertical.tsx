import { useRef, useState } from 'react'
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { journey } from '../../data/industry'
import { ChipToken } from './ChipToken'
import { StationDot, StationText } from './StationCard'

/** Mobile & reduced-motion: a vertical timeline. The chip token slides down the rail as you scroll. */
export function JourneyVertical() {
  const ref = useRef<HTMLOListElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 60%', 'end 60%'] })
  const top = useTransform(scrollYProgress, (v) => `${v * 100}%`)
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1])
  const [active, setActive] = useState(0)
  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const i = Math.min(journey.length - 1, Math.max(0, Math.round(v * (journey.length - 1))))
    setActive((prev) => (prev === i ? prev : i))
  })

  return (
    <div className="container-x">
      <ol ref={ref} className="relative ml-6 max-w-3xl space-y-10 border-l border-white/10 pl-10" aria-label="Journey of an AI chip, ten stops">
        {!reduce && (
          <>
            <motion.span
              aria-hidden="true"
              className="absolute -left-px top-0 h-full w-0.5 origin-top bg-gradient-to-b from-slate via-cyan to-amber"
              style={{ scaleY: fill }}
            />
            <motion.div aria-hidden="true" className="absolute -left-[22px] z-10 -translate-y-1/2" style={{ top }}>
              <div className="scale-90">
                <ChipToken stop={journey[active]} />
              </div>
            </motion.div>
          </>
        )}
        {journey.map((stop, i) => (
          <motion.li
            key={stop.id}
            className="relative"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10% 0px' }}
            transition={{ duration: 0.5 }}
          >
            <span className="absolute -left-[64px] top-0">
              <StationDot stop={stop} active={false} passed />
            </span>
            <StationText stop={stop} index={i} active />
          </motion.li>
        ))}
      </ol>
    </div>
  )
}
