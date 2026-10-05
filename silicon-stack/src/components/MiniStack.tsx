import { motion } from 'framer-motion'
import { layers, type Accent, type LayerId } from '../data/industry'
import { accentHex } from './accent'

interface Props {
  primary: LayerId[]
  secondary: LayerId[]
  accent: Accent
}

/** A small vertical version of the 9-layer stack with the company's layers highlighted. */
export function MiniStack({ primary, secondary, accent }: Props) {
  const color = accentHex[accent]
  const ordered = [...layers].reverse()
  const label = `Position in the stack: ${[...primary, ...secondary]
    .map((id) => layers.find((l) => l.id === id)?.name)
    .join(', ')}`

  return (
    <figure aria-label={label} className="w-full">
      <ul className="flex flex-col gap-1">
        {ordered.map((layer, i) => {
          const isPrimary = primary.includes(layer.id)
          const isSecondary = secondary.includes(layer.id)
          return (
            <motion.li
              key={layer.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-xs"
              style={{
                background: isPrimary ? `${color}26` : isSecondary ? `${color}12` : 'rgb(255 255 255 / 0.03)',
                border: `1px solid ${isPrimary ? `${color}99` : isSecondary ? `${color}44` : 'transparent'}`,
                color: isPrimary ? color : isSecondary ? '#cbd5e1' : '#6b7886',
              }}
            >
              <span className="w-4 tabular-nums opacity-70">{layers.indexOf(layer) + 1}</span>
              <span className="truncate">{layer.name}</span>
              {isPrimary && <span className="ml-auto font-medium">Core</span>}
              {isSecondary && <span className="ml-auto opacity-80">Also</span>}
            </motion.li>
          )
        })}
      </ul>
    </figure>
  )
}
