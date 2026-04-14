import type { Metadata } from 'next'
import dynamic from 'next/dynamic'
import HeroSection from '@/components/marketing/HeroSection'
import SocialProofBar from '@/components/marketing/SocialProofBar'

const ProblemSection = dynamic(() => import('@/components/marketing/ProblemSection'))
const PrimitivesSection = dynamic(() => import('@/components/marketing/PrimitivesSection'))
const DecisionDNASection = dynamic(() => import('@/components/marketing/DecisionDNASection'))
const LazyMindSection = dynamic(() => import('@/components/marketing/LazyMindSection'))
const ConsolidationMap = dynamic(() => import('@/components/marketing/ConsolidationMap'))
const PricingSection = dynamic(() => import('@/components/marketing/PricingSection'))
const TestimonialsSection = dynamic(() => import('@/components/marketing/TestimonialsSection'))
const CTABanner = dynamic(() => import('@/components/marketing/CTABanner'))

export const metadata: Metadata = {
  title: 'Lazynext — Stop Switching Apps. Start Shipping Work.',
  description: 'One platform that replaces every tool your team is already misusing. Tasks, docs, decisions, and AI — unified on an infinite canvas.',
  openGraph: {
    title: 'Lazynext — Stop Switching Apps. Start Shipping Work.',
    description: 'Tasks, docs, decisions, and AI in one unified workspace. Decision DNA tracks every choice your team makes.',
  },
}

export default function LandingPage() {
  return (
    <main id="main-content">
      <HeroSection />
      <SocialProofBar />
      <ProblemSection />
      <PrimitivesSection />
      <DecisionDNASection />
      <LazyMindSection />
      <ConsolidationMap />
      <PricingSection />
      <TestimonialsSection />
      <CTABanner />
    </main>
  )
}
