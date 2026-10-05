import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { site } from '../../data/industry'
import { Wafer, WaferSheen } from './Wafer'
import { TransistorGrid } from './TransistorGrid'

const zoomCaption = 'Zoom into one die and you find billions of transistors — microscopic on/off switches built where gates cross silicon fins.'

export function Hero() {
  const reduce = useReducedMotion()
  return reduce ? <StaticHero /> : <AnimatedHero />
}

function HeroText() {
  return (
    <>
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-cyan">{site.name}</p>
      <h1 id="hero-title" className="text-5xl font-semibold leading-[1.02] tracking-tight text-fg sm:text-6xl lg:text-7xl">
        From Sand to <span className="bg-gradient-to-r from-cyan via-teal to-amber bg-clip-text text-transparent">Supercomputer</span>
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted md:text-xl">{site.subtitle}</p>
    </>
  )
}

function AnimatedHero() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] })

  const textOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  const textY = useTransform(scrollYProgress, [0, 0.25], [0, -40])
  const waferScale = useTransform(scrollYProgress, [0, 0.75], [1, 9])
  const waferOpacity = useTransform(scrollYProgress, [0.45, 0.72], [1, 0])
  const gridOpacity = useTransform(scrollYProgress, [0.5, 0.78], [0, 1])
  const gridScale = useTransform(scrollYProgress, [0.5, 1], [1.6, 1])
  const captionOpacity = useTransform(scrollYProgress, [0.72, 0.85], [0, 1])
  const captionY = useTransform(scrollYProgress, [0.72, 0.85], [20, 0])
  const hintOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0])

  return (
    <section id="top" ref={ref} aria-labelledby="hero-title" className="relative h-[260vh]">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_70%_45%,rgba(34,211,238,0.12),transparent_60%)]" />

        <div className="container-x relative grid items-center gap-8 pt-14 md:grid-cols-[1.05fr_1fr]">
          <motion.div style={{ opacity: textOpacity, y: textY }} className="relative z-10">
            <HeroText />
          </motion.div>

          <motion.div style={{ scale: waferScale, opacity: waferOpacity }} className="relative mx-auto aspect-square w-[min(78vw,46vh)] md:w-[min(42vw,62vh)]">
            <motion.div
              className="absolute inset-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 140, ease: 'linear', repeat: Infinity }}
            >
              <Wafer className="size-full drop-shadow-[0_0_60px_rgba(34,211,238,0.18)]" />
            </motion.div>
            <WaferSheen className="absolute inset-0 size-full" />
          </motion.div>
        </div>

        <motion.div style={{ opacity: gridOpacity, scale: gridScale }} className="pointer-events-none absolute inset-0">
          <TransistorGrid className="size-full" />
        </motion.div>

        <motion.div style={{ opacity: captionOpacity, y: captionY }} className="pointer-events-none absolute inset-x-0 bottom-[12vh] flex justify-center px-4">
          <div className="max-w-xl rounded-2xl border border-line bg-ink/80 px-6 py-5 text-center backdrop-blur">
            <p className="text-lg text-fg md:text-xl">{zoomCaption}</p>
            <p className="mt-2 text-xs text-faint">Simplified for clarity — real transistors are far smaller and in 3D.</p>
          </div>
        </motion.div>

        <motion.a
          href="#stack"
          style={{ opacity: hintOpacity }}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 text-xs text-faint"
        >
          {site.scrollHint}
          <motion.span animate={{ y: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
            <ArrowDown className="size-4" aria-hidden="true" />
          </motion.span>
        </motion.a>
      </div>
    </section>
  )
}

function StaticHero() {
  return (
    <section id="top" aria-labelledby="hero-title" className="relative pb-20 pt-28">
      <div className="container-x grid items-center gap-10 md:grid-cols-[1.05fr_1fr]">
        <div>
          <HeroText />
          <p className="mt-6 max-w-xl rounded-xl border border-line bg-surface p-4 text-muted">{zoomCaption}</p>
        </div>
        <div className="relative mx-auto aspect-square w-[min(78vw,420px)]">
          <Wafer className="size-full" />
          <WaferSheen className="absolute inset-0 size-full" />
        </div>
      </div>
    </section>
  )
}
