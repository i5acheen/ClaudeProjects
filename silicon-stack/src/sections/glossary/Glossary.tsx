import { useDeferredValue, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { glossary, sectionIntros } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'

const slug = (t: string) => `term-${t.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

export function Glossary() {
  const [query, setQuery] = useState('')
  const q = useDeferredValue(query.trim().toLowerCase())
  const results = useMemo(
    () => glossary.filter((g) => !q || g.term.toLowerCase().includes(q) || g.definition.toLowerCase().includes(q)),
    [q],
  )

  return (
    <Section id="glossary" className="grid-bg">
      <div className="container-x">
        <SectionHeading id="glossary-title" {...sectionIntros.glossary} />

        <div className="relative mb-6 max-w-xl">
          <label htmlFor="glossary-search" className="sr-only">
            Search the glossary
          </label>
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" aria-hidden="true" />
          <input
            id="glossary-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search terms, e.g. “HBM” or “mask”"
            autoComplete="off"
            className="w-full rounded-2xl border border-line bg-surface py-3.5 pl-12 pr-12 text-lg text-fg placeholder:text-faint focus:border-cyan/60 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-faint hover:text-fg">
              <X className="size-4" />
            </button>
          )}
        </div>
        <p className="mb-4 text-sm text-faint" aria-live="polite">
          {results.length} of {glossary.length} terms
        </p>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence initial={false}>
            {results.map((g) => (
              <motion.div
                layout
                key={g.term}
                id={slug(g.term)}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="card p-5"
              >
                <dt className="text-lg font-semibold text-cyan">{g.term}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{g.definition}</dd>
                {g.related && (
                  <dd className="mt-3 flex flex-wrap gap-1.5 text-xs">
                    <span className="text-faint">See also:</span>
                    {g.related.map((r) => (
                      <button key={r} type="button" onClick={() => setQuery(r)} className="rounded-full border border-line px-2 py-0.5 text-muted hover:border-cyan/50 hover:text-fg">
                        {r}
                      </button>
                    ))}
                  </dd>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </dl>
        {results.length === 0 && <p className="text-muted">No terms match “{query}”. Try a shorter word.</p>}
      </div>
    </Section>
  )
}
