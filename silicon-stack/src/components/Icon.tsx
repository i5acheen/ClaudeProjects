import {
  Building2,
  CircleCheck,
  Cloud,
  CodeXml,
  Cog,
  Cpu,
  Disc,
  Factory,
  FlaskConical,
  Layers,
  MemoryStick,
  Mountain,
  Package,
  PenTool,
  Scissors,
  Server,
  Sun,
  Wind,
  type LucideIcon,
} from 'lucide-react'
import type { IconKey } from '../data/industry'

const icons: Record<IconKey, LucideIcon> = {
  flask: FlaskConical,
  code: CodeXml,
  cog: Cog,
  cpu: Cpu,
  factory: Factory,
  memory: MemoryStick,
  layers: Layers,
  server: Server,
  cloud: Cloud,
  mountain: Mountain,
  disc: Disc,
  pen: PenTool,
  sun: Sun,
  wind: Wind,
  scissors: Scissors,
  package: Package,
  check: CircleCheck,
  building: Building2,
}

export function Icon({ name, className, strokeWidth = 1.75 }: { name: IconKey; className?: string; strokeWidth?: number }) {
  const C = icons[name]
  return <C className={className} strokeWidth={strokeWidth} aria-hidden="true" />
}
