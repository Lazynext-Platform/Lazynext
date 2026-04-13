import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing — Lazynext',
  description: 'Simple, transparent pricing. Start free, scale as you grow. Plans from $0 to $49/month.',
  openGraph: {
    title: 'Pricing — Lazynext',
    description: 'Simple, transparent pricing for teams of all sizes.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children
}
