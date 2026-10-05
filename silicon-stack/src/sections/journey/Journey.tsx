import { useReducedMotion } from 'framer-motion'
import { sectionIntros } from '../../data/industry'
import { Section } from '../../components/Section'
import { SectionHeading } from '../../components/SectionHeading'
import { SimplifiedNote } from '../../components/SimplifiedNote'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { JourneyHorizontal } from './JourneyHorizontal'
import { JourneyVertical } from './JourneyVertical'

export function Journey() {
  const wide = useMediaQuery('(min-width: 768px)')
  const reduce = useReducedMotion()
  const horizontal = wide && !reduce

  return (
    <Section id="journey" className="!pb-12">
      <div className="container-x">
        <SectionHeading id="journey-title" {...sectionIntros.journey} />
      </div>
      {horizontal ? <JourneyHorizontal /> : <JourneyVertical />}
      <div className="container-x">
        <SimplifiedNote>Simplified for clarity. Real chips pass through many more steps, sites and suppliers; the companies shown are examples.</SimplifiedNote>
      </div>
    </Section>
  )
}
