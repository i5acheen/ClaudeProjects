import { Info } from 'lucide-react'

export function SimplifiedNote({ children = 'Simplified for clarity — not to scale.' }: { children?: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
      <Info className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </p>
  )
}
