import { motion } from 'framer-motion'
import { Cpu } from 'lucide-react'
import type { JourneyStop } from '../../data/industry'
import { accentHex } from '../../components/accent'

/** The small "chip" that travels from station to station. Its glow changes with each stage. */
export function ChipToken({ stop }: { stop: JourneyStop }) {
  const color = accentHex[stop.accent]
  return (
    <motion.div
      aria-hidden="true"
      className="relative flex size-11 items-center justify-center rounded-xl border bg-ink"
      animate={{ borderColor: color, boxShadow: `0 0 28px -4px ${color}`, color }}
      transition={{ duration: 0.4 }}
    >
      <Cpu className="size-6" strokeWidth={1.6} />
    </motion.div>
  )
}
