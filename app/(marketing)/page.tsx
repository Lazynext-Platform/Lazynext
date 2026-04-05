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
