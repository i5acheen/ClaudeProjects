import { AlertTriangle, Building2, Coins, Lightbulb, Wrench } from 'lucide-react'
import type { Layer } from '../../data/industry'
import { accentText } from '../../components/accent'

export function LayerPanel({ layer }: { layer: Layer }) {
  const tone = accentText[layer.accent]
  return (
    <div className="grid gap-4 p-5 sm:grid-cols-2 md:p-6">
      <Block icon={<Wrench className={`size-4 ${tone}`} />} title="What happens here">
        <p>{layer.whatHappens}</p>
      </Block>
      <Block icon={<Lightbulb className={`size-4 ${tone}`} />} title="Why it matters">
        <p>{layer.whyItMatters}</p>
      </Block>
      <Block icon={<Coins className={`size-4 ${tone}`} />} title="How they make money">
        <p>{layer.howTheyMakeMoney}</p>
      </Block>
      <Block icon={<AlertTriangle className={`size-4 ${tone}`} />} title="Key bottlenecks">
        <ul className="space-y-1.5">
          {layer.bottlenecks.map((b) => (
            <li key={b} className="flex gap-2">
              <span aria-hidden="true" className={`mt-2 size-1.5 shrink-0 rounded-full bg-current ${tone}`} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </Block>
      <div className="sm:col-span-2">
        <Block icon={<Building2 className={`size-4 ${tone}`} />} title="Example companies">
          <ul className="flex flex-wrap gap-2">
            {layer.companies.map((c) => (
              <li key={c} className="rounded-full border border-line bg-white/[0.04] px-3 py-1 text-sm text-fg">
                {c}
              </li>
            ))}
          </ul>
        </Block>
      </div>
    </div>
  )
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-ink/60 p-4">
      <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-fg">
        {icon}
        {title}
      </h4>
      <div className="text-[15px] leading-relaxed text-muted">{children}</div>
    </div>
  )
}
