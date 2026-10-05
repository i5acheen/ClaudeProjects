import { motion } from 'framer-motion'
import type { JourneyStop } from '../../data/industry'
import { Icon } from '../../components/Icon'
import { accentHex } from '../../components/accent'

export function StationDot({ stop, active, passed }: { stop: JourneyStop; active: boolean; passed: boolean }) {
  const color = accentHex[stop.accent]
  return (
    <motion.span
      className="flex size-12 items-center justify-center rounded-full border-2 bg-ink"
      animate={{
        scale: active ? 1.12 : 1,
        borderColor: active || passed ? color : 'rgba(255,255,255,0.12)',
        color: active || passed ? color : '#6b7886',
      }}
      transition={{ duration: 0.3 }}
    >
      <Icon name={stop.icon} className="size-5" />
    </motion.span>
  )
}

export function StationText({ stop, index, active }: { stop: JourneyStop; index: number; active: boolean }) {
  return (
    <motion.div animate={{ opacity: active ? 1 : 0.55 }} transition={{ duration: 0.3 }}>
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-faint">Stop {index + 1}</p>
      <h3 className="mt-1 text-xl font-semibold text-fg md:text-2xl">{stop.title}</h3>
      <p className="mt-1 text-sm font-medium" style={{ color: accentHex[stop.accent] }}>
        {stop.where}
      </p>
      <p className="mt-2 text-[15px] leading-relaxed text-muted md:text-base">{stop.caption}</p>
    </motion.div>
  )
}
