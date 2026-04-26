import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HeroSection from '@/components/marketing/HeroSection'

const ProblemSection = dynamic(() => import('@/components/marketing/ProblemSection'))
const PrimitivesSection = dynamic(() => import('@/components/marketing/PrimitivesSection'))
const DecisionDNASection = dynamic(() => import('@/components/marketing/DecisionDNASection'))
const LazyMindSection = dynamic(() => import('@/components/marketing/LazyMindSection'))
const ConsolidationMap = dynamic(() => import('@/components/marketing/ConsolidationMap'))
const PricingSection = dynamic(() => import('@/components/marketing/PricingSection'))
const CTABanner = dynamic(() => import('@/components/marketing/CTABanner'))

export const metadata: Metadata = {
  title: 'Lazynext — The Decision Intelligence Platform for Teams',
  description: 'Capture, score, and learn from every decision your team makes. BI told you what happened. DI tells you why you chose it, what it cost, and how to choose better.',
  openGraph: {
    title: 'Lazynext — The Decision Intelligence Platform for Teams',
    description: 'Log every decision in 30 seconds. Get an AI-generated quality score, track the outcome, and compound your team\u2019s judgment over time.',
  },
}

export default function LandingPage() {
  return (
    <main id="main-content">
      <HeroSection />
      <ProblemSection />
      <PrimitivesSection />
      <DecisionDNASection />
      <LazyMindSection />
      <ConsolidationMap />
      <PricingSection />
      <CTABanner />
    </main>
  )
}
