# 🏗️ Feature Architecture — Landing Page

> **Feature**: 01 — Landing Page
> **Status**: 🟢 FINALIZED
> **Date**: 2026-04-06

---

## Overview

Convert the existing basic landing page (`app/(marketing)/page.tsx`) into a full 12-section marketing page matching the Blueprint mockup. The page uses a component-per-section architecture with the existing marketing layout providing header/footer.

## File Structure

```
app/(marketing)/
├── layout.tsx                    # MODIFY — Enhanced header/footer from mockup
├── page.tsx                      # MODIFY — Compose all landing sections
└── pricing/                     # Existing (untouched in this feature)

components/marketing/
├── HeroSection.tsx              # NEW — Hero with badge, headline, CTAs, canvas mockup
├── SocialProofBar.tsx           # NEW — Team count + logo placeholders
├── ProblemSection.tsx           # NEW — Tool graveyard + Lazynext card
├── PrimitivesSection.tsx        # NEW — 7 node type cards
├── DecisionDNASection.tsx       # NEW — Decision card mockup + feature list
├── LazyMindSection.tsx          # NEW — AI chat mockup + feature list
├── ConsolidationMap.tsx         # NEW — SVG convergence + price comparison
├── PricingSection.tsx           # NEW — Toggle + 3-tier pricing (client component)
├── TestimonialsSection.tsx      # NEW — 3 testimonial cards
├── CTABanner.tsx                # NEW — Blue gradient CTA
└── MobileMenu.tsx               # NEW — Mobile hamburger dropdown (client component)
```

## Component Architecture

### Server Components (default)
- `HeroSection` — Static hero with CSS animations (float-anim)
- `SocialProofBar` — Static placeholder logos
- `ProblemSection` — Static competitor cards + Lazynext card
- `PrimitivesSection` — Static 7 primitive cards
- `DecisionDNASection` — Static decision card mockup + text
- `LazyMindSection` — Static AI chat mockup + feature list
- `ConsolidationMap` — Static SVG diagram + price comparison
- `TestimonialsSection` — Static testimonial cards
- `CTABanner` — Static CTA section

### Client Components ('use client')
- `PricingSection` — Needs useState for monthly/annual toggle
- `MobileMenu` — Needs useState for menu open/close toggle

## Data Flow

No API calls. No database queries. All content is static/hardcoded within components. Pricing toggle uses local React state only.

## Layout Modifications

The existing `app/(marketing)/layout.tsx` will be enhanced to match the mockup:
- Header: Add "Blog" nav link, add gradient backdrop, improve mobile menu
- Footer: Expand to 5-column (Brand, Product, Company, Legal, Support) with "Built in India" tagline

## Styling Architecture

- All styles via Tailwind utility classes
- Custom CSS classes in `app/globals.css` for:
  - `.gradient-hero` — Hero background gradient
  - `.gradient-decision` — Decision DNA section gradient
  - `.card-hover` — Card lift + shadow transition
  - `.float-anim` — Hero canvas node floating animation
  - `.consolidation-line` — SVG dashed line animation
- `scroll-smooth` on html element for anchor links

## Dependencies

No new npm packages required. All existing dependencies are sufficient:
- `lucide-react` — Icons
- `next/link` — Routing
- `framer-motion` — Available but not strictly needed (CSS animations suffice)

## Architecture Finalized ✅

Ready for task planning.
