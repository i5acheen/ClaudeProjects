import type { ReactNode } from 'react'

export function Section({ id, children, className = '' }: { id: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`relative py-24 md:py-32 ${className}`}>
      {children}
    </section>
  )
}
