import { motion } from 'framer-motion'
import { businessModelRows, businessModels, sectionIntros, type BusinessModel } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { accentHex } from '../../components/accent'
import { RatingMeter } from './RatingMeter'

function Cell({ model, row }: { model: BusinessModel; row: (typeof businessModelRows)[number] }) {
  if (row.key === 'capitalIntensity') {
    return (
      <>
        <RatingMeter rating={model.capitalIntensity} color={accentHex[model.accent]} />
        <span className="mt-1 block text-sm text-faint">{model.capitalNote}</span>
      </>
    )
  }
  return <>{String(model[row.key])}</>
}

export function BusinessModels() {
  return (
    <Section id="models" className="grid-bg">
      <div className="container-x">
        <SectionHeading id="models-title" {...sectionIntros.models} />

        {/* Desktop: comparison table */}
        <div className="card hidden overflow-hidden lg:block">
          <table className="w-full table-fixed border-collapse text-left">
            <caption className="sr-only">Comparison of five semiconductor business models</caption>
            <thead>
              <tr>
                <th scope="col" className="w-40 p-5 text-sm font-medium text-faint">
                  <span className="sr-only">Attribute</span>
                </th>
                {businessModels.map((m, i) => (
                  <motion.th
                    key={m.id}
                    scope="col"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                    className="border-l border-line p-5 align-bottom"
                  >
                    <span className="block h-1 w-10 rounded-full" style={{ background: accentHex[m.accent] }} aria-hidden="true" />
                    <span className="mt-3 block text-lg font-semibold leading-snug text-fg">{m.model}</span>
                    <span className="mt-1 block text-sm font-normal" style={{ color: accentHex[m.accent] }}>
                      e.g. {m.example}
                    </span>
                  </motion.th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businessModelRows.map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <th scope="row" className="p-5 align-top text-sm font-semibold uppercase tracking-wider text-muted">
                    {row.label}
                  </th>
                  {businessModels.map((m) => (
                    <td key={m.id} className="border-l border-line p-5 align-top text-[15px] leading-relaxed text-fg/90">
                      <Cell model={m} row={row} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile / tablet: one card per model */}
        <ul className="grid gap-4 sm:grid-cols-2 lg:hidden">
          {businessModels.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: (i % 2) * 0.08 }}
              className="card p-5"
              style={{ borderTop: `3px solid ${accentHex[m.accent]}` }}
            >
              <h3 className="text-lg font-semibold text-fg">{m.model}</h3>
              <p className="text-sm" style={{ color: accentHex[m.accent] }}>
                e.g. {m.example}
              </p>
              <dl className="mt-4 space-y-3">
                {businessModelRows.map((row) => (
                  <div key={row.key}>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-faint">{row.label}</dt>
                    <dd className="mt-0.5 text-[15px] text-fg/90">
                      <Cell model={m} row={row} />
                    </dd>
                  </div>
                ))}
              </dl>
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-faint">Qualitative labels for comparison only, not financial data.</p>
      </div>
    </Section>
  )
}
