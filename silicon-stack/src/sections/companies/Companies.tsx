import { useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { companies, sectionIntros, type CompanyId } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { accentHex } from '../../components/accent'
import { CompanyCard } from './CompanyCard'

export function Companies() {
  const [active, setActive] = useState<CompanyId>('ats')
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const current = companies.find((c) => c.id === active)!

  // WAI-ARIA tabs: arrow keys move focus and selection, Home/End jump.
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    let next: number
    if (e.key === 'ArrowRight') next = (index + 1) % companies.length
    else if (e.key === 'ArrowLeft') next = (index - 1 + companies.length) % companies.length
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = companies.length - 1
    else return
    e.preventDefault()
    setActive(companies[next].id)
    tabRefs.current[next]?.focus()
  }

  return (
    <Section id="companies" className="grid-bg">
      <div className="container-x">
        <SectionHeading id="companies-title" {...sectionIntros.companies} />

        <div role="tablist" aria-label="Hero companies" className="mb-6 inline-flex gap-1 rounded-2xl border border-line bg-surface p-1">
          {companies.map((c, i) => {
            const selected = c.id === active
            return (
              <button
                key={c.id}
                ref={(el) => {
                  tabRefs.current[i] = el
                }}
                role="tab"
                id={`tab-${c.id}`}
                aria-selected={selected}
                aria-controls={`panel-${c.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(c.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`relative rounded-xl px-5 py-2.5 text-base font-semibold transition-colors md:px-7 ${selected ? 'text-ink' : 'text-muted hover:text-fg'}`}
              >
                {selected && (
                  <motion.span
                    layoutId="company-tab"
                    className="absolute inset-0 rounded-xl"
                    style={{ background: accentHex[c.accent] }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
                <span className="relative">{c.name}</span>
              </button>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            role="tabpanel"
            id={`panel-${current.id}`}
            aria-labelledby={`tab-${current.id}`}
            tabIndex={0}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <CompanyCard company={current} />
          </motion.div>
        </AnimatePresence>
      </div>
    </Section>
  )
}
