import type { Metadata } from 'next'
import HeroSection from '@/components/marketing/HeroSection'
import SocialProofBar from '@/components/marketing/SocialProofBar'
import ProblemSection from '@/components/marketing/ProblemSection'
import PrimitivesSection from '@/components/marketing/PrimitivesSection'
import DecisionDNASection from '@/components/marketing/DecisionDNASection'
import LazyMindSection from '@/components/marketing/LazyMindSection'
import ConsolidationMap from '@/components/marketing/ConsolidationMap'
import PricingSection from '@/components/marketing/PricingSection'
import TestimonialsSection from '@/components/marketing/TestimonialsSection'
import CTABanner from '@/components/marketing/CTABanner'

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
    <main>
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
