import { useState } from 'react'
import { AnimatePresence, motion, useScroll, useSpring } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { navItems, site } from '../data/industry'
import { useActiveSection } from '../hooks/useActiveSection'

const ids = navItems.map((n) => n.id)

export function Nav() {
  const active = useActiveSection(ids)
  const [open, setOpen] = useState(false)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 })

  return (
    <header className={`fixed inset-x-0 top-0 z-50 border-b border-line backdrop-blur-xl ${open ? 'bg-ink/95' : 'bg-ink/75'}`}>
      <nav aria-label="Sections" className="container-x flex h-14 items-center justify-between gap-4">
        <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight text-fg">
          <WaferMark />
          <span>{site.name}</span>
        </a>

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive = active === item.id
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={isActive ? 'true' : undefined}
                  className={`relative rounded-full px-3 py-1.5 text-sm transition-colors ${
                    isActive ? 'text-fg' : 'text-muted hover:text-fg'
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 -z-10 rounded-full bg-white/[0.07]"
                      transition={{ type: 'spring', stiffness: 400, damping: 34 }}
                    />
                  )}
                  {item.label}
                </a>
              </li>
            )
          })}
        </ul>

        <button
          type="button"
          className="rounded-lg p-2 text-muted hover:text-fg lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="container-x grid grid-cols-2 gap-1 overflow-hidden pb-3 lg:hidden"
          >
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  onClick={() => setOpen(false)}
                  className={`block rounded-lg px-3 py-2 text-sm ${
                    active === item.id ? 'bg-white/[0.07] text-fg' : 'text-muted'
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <motion.div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-gradient-to-r from-cyan via-teal to-amber"
        style={{ scaleX: progress }}
      />
    </header>
  )
}

function WaferMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="var(--color-cyan)" strokeWidth="1.6" />
      <path d="M6 9h12M6 12h12M6 15h12M9 6v12M12 6v12M15 6v12" stroke="var(--color-cyan)" strokeOpacity=".5" strokeWidth=".9" />
    </svg>
  )
}
