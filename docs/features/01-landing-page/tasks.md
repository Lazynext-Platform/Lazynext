# 📋 Tasks — Landing Page

> **Feature**: 01 — Landing Page
> **Branch**: `feature/01-landing-page`
> **Created**: 2026-04-06

---

## Setup

- [x] Create feature branch `feature/01-landing-page` from `main`
- [x] Add custom CSS classes (gradient-hero, card-hover, float-anim, consolidation-line) to `globals.css`

## Components (Build)

- [x] Create `components/marketing/HeroSection.tsx` — Badge, headline, subtitle, CTAs, canvas mockup with floating nodes
- [x] Create `components/marketing/SocialProofBar.tsx` — Team count + 6 logo placeholders
- [x] Create `components/marketing/ProblemSection.tsx` — 2x2 competitor grid + arrow + Lazynext card
- [x] Create `components/marketing/PrimitivesSection.tsx` — 7 primitive cards, DECISION highlighted
- [x] Create `components/marketing/DecisionDNASection.tsx` — Decision card mockup + hero feature text + 3 bullet points
- [x] Create `components/marketing/LazyMindSection.tsx` — AI chat mockup + 4 feature items
- [x] Create `components/marketing/ConsolidationMap.tsx` — SVG convergence diagram + price comparison
- [x] Create `components/marketing/PricingSection.tsx` — Monthly/annual toggle + 3-tier cards (client component)
- [x] Create `components/marketing/TestimonialsSection.tsx` — 3 testimonial cards with ratings
- [x] Create `components/marketing/CTABanner.tsx` — Blue gradient CTA with decorative blur elements

## Layout & Page

- [x] Update `app/(marketing)/layout.tsx` — Enhanced header (Blog link, mobile menu) + 5-column footer
- [x] Update `app/(marketing)/page.tsx` — Compose all section components in order

## Verification

- [x] Visual comparison at 375px, 768px, 1280px
- [x] Pricing toggle works (monthly/annual)
- [x] Mobile menu opens/closes
- [x] Smooth scroll to anchor sections (#features, #pricing)
- [x] Card hover effects work
- [x] Hero canvas nodes animate (float)
- [x] All links point to correct routes (/sign-up, /sign-in, /pricing)
