import { motion } from 'framer-motion'

interface Props {
  eyebrow: string
  title: string
  body: string
  id?: string
}

export function SectionHeading({ eyebrow, title, body, id }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="mb-10 max-w-3xl md:mb-14"
    >
      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-cyan">{eyebrow}</p>
      <h2 id={id} className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl md:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-lg leading-relaxed text-muted md:text-xl">{body}</p>
    </motion.div>
  )
}
