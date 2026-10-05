import type { ReactNode } from 'react'
import { ArrowDownToLine, ArrowUpFromLine, Box, Coins, MapPin, ShieldCheck, TriangleAlert } from 'lucide-react'
import type { Company } from '../../data/industry'
import { MiniStack } from '../../components/MiniStack'
import { SimplifiedNote } from '../../components/SimplifiedNote'
import { accentHex, accentText } from '../../components/accent'
import { EuvMachine } from './visuals/EuvMachine'
import { GpuExploded } from './visuals/GpuExploded'
import { SubstrateCrossSection } from './visuals/SubstrateCrossSection'

const visuals = {
  asml: EuvMachine,
  nvidia: GpuExploded,
  ats: SubstrateCrossSection,
}

export function CompanyCard({ company }: { company: Company }) {
  const Visual = visuals[company.id]
  const color = accentHex[company.accent]
  const tone = accentText[company.accent]

  return (
    <article className="card overflow-hidden" style={{ boxShadow: `0 0 80px -40px ${color}` }}>
      <header className="border-b border-line p-6 md:p-8" style={{ background: `linear-gradient(120deg, ${color}14, transparent 60%)` }}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h3 className={`text-3xl font-semibold tracking-tight md:text-4xl ${tone}`}>{company.name}</h3>
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <MapPin className="size-4" aria-hidden="true" /> {company.hq}
          </p>
        </div>
        <p className="mt-1 text-sm text-faint">{company.fullName}</p>
        <p className="mt-3 text-xl text-fg">{company.tagline}</p>
      </header>

      <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.45fr_1fr]">
        <figure className="rounded-2xl border border-line bg-ink/70 p-4 md:p-5">
          <figcaption className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-semibold text-fg">{company.visualTitle}</span>
            <span className="text-xs text-faint">{company.visualHint}</span>
          </figcaption>
          <Visual />
          <SimplifiedNote />
        </figure>

        <div className="flex flex-col gap-6">
          <InfoBlock icon={<Box className={`size-4 ${tone}`} />} title="What it actually makes">
            <p>{company.whatItMakes}</p>
          </InfoBlock>
          <div>
            <h4 className="mb-2 text-sm font-semibold uppercase tracking-wider text-fg">Where it sits in the stack</h4>
            <MiniStack primary={company.layers.primary} secondary={company.layers.secondary} accent={company.accent} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 border-t border-line p-6 md:grid-cols-2 md:p-8 xl:grid-cols-4">
        <InfoBlock icon={<Coins className={`size-4 ${tone}`} />} title="Business model" boxed>
          <p>{company.businessModel}</p>
        </InfoBlock>
        <InfoBlock icon={<ArrowUpFromLine className={`size-4 ${tone}`} />} title="Customers & suppliers" boxed>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-faint">Sells to</p>
          <Bullets items={company.customers} tone={tone} />
          <p className="mb-1 mt-3 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-faint">
            <ArrowDownToLine className="size-3" aria-hidden="true" /> Buys from
          </p>
          <Bullets items={company.suppliers} tone={tone} />
        </InfoBlock>
        <InfoBlock icon={<ShieldCheck className={`size-4 ${tone}`} />} title="Its moat" boxed>
          <Bullets items={company.moat} tone={tone} />
        </InfoBlock>
        <InfoBlock icon={<TriangleAlert className={`size-4 ${tone}`} />} title="Key risks" boxed>
          <Bullets items={company.risks} tone={tone} />
        </InfoBlock>
      </div>
    </article>
  )
}

function InfoBlock({ icon, title, children, boxed }: { icon: ReactNode; title: string; children: ReactNode; boxed?: boolean }) {
  return (
    <section className={boxed ? 'rounded-xl border border-line bg-ink/50 p-4' : ''}>
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-fg">
        {icon}
        {title}
      </h4>
      <div className="text-[15px] leading-relaxed text-muted">{children}</div>
    </section>
  )
}

function Bullets({ items, tone }: { items: string[]; tone: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item) => (
        <li key={item} className="flex gap-2">
          <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full bg-current ${tone}`} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}
