import { useRef, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowUp, ChevronDown } from 'lucide-react'
import { layers, sectionIntros, type LayerId } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { Icon } from '../../components/Icon'
import { accentHex } from '../../components/accent'
import { LayerPanel } from './LayerPanel'

const intro = sectionIntros.stack
// Shown top (customers) to bottom (materials) so the stack "builds up" from its foundation.
const displayed = [...layers].reverse()

export function StackSection() {
  const [open, setOpen] = useState<LayerId | null>(null)
  const listRef = useRef<HTMLOListElement>(null)
  const inView = useInView(listRef, { once: true, margin: '-15% 0px' })

  return (
    <Section id="stack" className="grid-bg">
      <div className="container-x">
        <SectionHeading id="stack-title" {...intro} />

        <div className="mx-auto max-w-4xl">
          <p className="mb-3 flex items-center gap-2 text-sm text-faint">
            <ArrowUp className="size-4" aria-hidden="true" /> Value flows upward — each layer depends on the ones beneath it
          </p>

          <ol ref={listRef} className="relative flex flex-col gap-2.5" aria-label="The nine layers of the semiconductor industry, from end customers at the top to materials at the bottom">
            {displayed.map((layer) => {
              const position = layers.indexOf(layer) // 0 = foundation
              const isOpen = open === layer.id
              const color = accentHex[layer.accent]
              const panelId = `layer-panel-${layer.id}`
              const buttonId = `layer-btn-${layer.id}`
              // slightly wider toward the foundation for a "stacked slab" feel
              const inset = `${position * 0.8}%`

              return (
                <motion.li
                  key={layer.id}
                  initial={{ opacity: 0, y: -28 }}
                  animate={inView ? { opacity: 1, y: 0 } : undefined}
                  transition={{ delay: position * 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  style={{ '--inset': inset } as CSSProperties}
                  className="md:mx-[var(--inset)]"
                >
                  <div
                    className="overflow-hidden rounded-2xl border bg-surface/90 transition-colors"
                    style={{
                      borderColor: isOpen ? `${color}80` : 'rgb(255 255 255 / 0.08)',
                      boxShadow: isOpen ? `0 0 40px -12px ${color}66` : undefined,
                    }}
                  >
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => setOpen(isOpen ? null : layer.id)}
                        className="group relative flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-white/[0.03] md:gap-4 md:px-5 md:py-4"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute left-0 h-8 w-1 rounded-r-full"
                          style={{ background: color, opacity: isOpen ? 1 : 0.55 }}
                        />
                        <span className="hidden w-6 shrink-0 text-sm tabular-nums text-faint sm:block">{String(position + 1).padStart(2, '0')}</span>
                        <span
                          className="flex size-9 shrink-0 items-center justify-center rounded-xl md:size-10"
                          style={{ background: `${color}1a`, color }}
                        >
                          <Icon name={layer.icon} className="size-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold text-fg md:text-lg">{layer.name}</span>
                          <span className="block text-sm text-muted">{layer.short}</span>
                        </span>
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-5 shrink-0 text-faint transition-transform duration-300 group-hover:text-fg ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </h3>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-labelledby={buttonId}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="border-t border-line"
                        >
                          <LayerPanel layer={layer} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.li>
              )
            })}
          </ol>
          <div aria-hidden="true" className="mx-auto mt-3 h-2 w-full rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <p className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-faint">Foundation</p>
        </div>
      </div>
    </Section>
  )
}
