import { site } from '../data/industry'

export function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <div className="container-x space-y-3 text-sm text-faint">
        <p className="text-muted">
          <span className="font-semibold text-fg">{site.name}</span> — {site.title}
        </p>
        <p id="footnote">* {site.footnote}</p>
        <p className="max-w-3xl">{site.disclaimer}</p>
        <p>Company names are trademarks of their respective owners and are used for identification only.</p>
      </div>
    </footer>
  )
}
