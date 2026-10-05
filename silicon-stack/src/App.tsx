import { MotionConfig } from 'framer-motion'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'
import { Hero } from './sections/hero/Hero'
import { StackSection } from './sections/stack/StackSection'
import { Journey } from './sections/journey/Journey'
import { Companies } from './sections/companies/Companies'
import { Network } from './sections/network/Network'
import { BusinessModels } from './sections/models/BusinessModels'
import { Geography } from './sections/geography/Geography'
import { Glossary } from './sections/glossary/Glossary'
import { Quiz } from './sections/quiz/Quiz'

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#stack"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Nav />
      <main>
        <Hero />
        <StackSection />
        <Journey />
        <Companies />
        <Network />
        <BusinessModels />
        <Geography />
        <Glossary />
        <Quiz />
      </main>
      <Footer />
    </MotionConfig>
  )
}
